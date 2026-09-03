import { SessionService } from '@/api/session/session.service';
import { TwoFactorService } from '@/api/two-factor/two-factor.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { UserService } from '@/api/user/user.service';
import { EmailQueueService } from '@/background/queues/email-queue/email-queue.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { DomainType, UserStatus } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { hashPassword, verifyPassword } from '@/utils/password.util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { RefreshResDto } from '../dto/refresh.res.dto';
import { RegisterResDto } from '../dto/register.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { JwtPayload } from '../strategy/jwt.strategy';
import { SessionRequestInfo } from '../types/session-request-info.type';

export interface IRegisterAuthParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ILoginAuthParams {
  email: string;
  password?: string;
}

export interface IChangePasswordParams {
  password?: string;
  oldPassword?: string;
  currentPassword?: string;
  newPassword: string;
}

export interface IAuthLoginResult {
  userId: string | AutoIncrementID;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: number;
  roles?: string[];
  user?: {
    id: AutoIncrementID;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string;
    domain: DomainType;
    roles: string[];
  };
  twoFactorRequired?: boolean;
  twoFactorToken?: string;
  twoFactorMethods?: string[];
  restoreAccountRequired?: boolean;
  restoreToken?: string;
}

interface CustomTokenPayload {
  sub: string | AutoIncrementID;
  email: string;
  domain: DomainType;
  type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly authSessionService: SessionService,
    private readonly adminTwoFactorService: TwoFactorService,
    private readonly emailQueueService: EmailQueueService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async register(
    dto: IRegisterAuthParams,
    domain: DomainType = DomainType.CLIENT,
    requestInfo?: SessionRequestInfo,
  ): Promise<RegisterResDto> {
    const existing = await this.userService.findByEmailAndDomain(
      dto.email,
      domain,
    );

    if (existing) {
      throw new ConflictException(`An account with this email already exists`);
    }

    const firstName = dto.firstName ?? '';
    const lastName = dto.lastName ?? '';

    const hashedPassword = await hashPassword(dto.password);

    const roles = await this.userService.findDefaultRole(domain);

    const user = await this.userService.create({
      email: dto.email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: dto.phone,
      domain,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      roles,
    });

    const fullUser = await this.userService.findById(user.id);
    if (!fullUser) {
      throw new NotFoundException('Failed to retrieve registered user');
    }

    await this.sendVerificationEmail(fullUser, domain);

    const authResponse = await this.createAuthResponse(
      fullUser,
      domain,
      requestInfo,
    );

    return plainToInstance(RegisterResDto, authResponse);
  }

  async login(
    dto: ILoginAuthParams,
    domain: DomainType,
    requestInfo?: SessionRequestInfo,
  ): Promise<IAuthLoginResult> {
    const { email, password } = dto;
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim(), domain },
      relations: [
        'adminProfile',
        'userProfile',
        'twoFactor',
        'roles',
        'roles.permissionEntities',
      ],
      withDeleted: true,
    });

    if (!user || !user.password || !password) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified && !user.verifiedAt) {
      throw new ForbiddenException({
        message: 'Vui lòng xác thực email trước khi đăng nhập',
        code: 'UNVERIFIED_EMAIL',
      });
    }

    if (user.deletedAt) {
      const msIn30Days = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - user.deletedAt.getTime() > msIn30Days) {
        throw new BadRequestException({ message: 'Invalid credentials' });
      }

      const payload = { id: user.id } as any;
      const restoreToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '5m',
      });

      return {
        userId: String(user.id),
        restoreAccountRequired: true,
        restoreToken,
      };
    }

    if (user.twoFactor?.isEnabled) {
      const twoFactorToken =
        await this.adminTwoFactorService.createTwoFactorLoginToken({
          id: String(user.id),
          purpose: 'admin-2fa-login',
        });

      return {
        userId: String(user.id),
        twoFactorRequired: true,
        twoFactorToken,
      };
    }

    await this.userService.updateLastLogin(user.id);
    const authResponse = await this.createAuthResponse(
      user,
      domain,
      requestInfo,
    );

    return authResponse;
  }

  async refreshToken(
    refreshTokenStr: string,
    domain?: DomainType,
  ): Promise<RefreshResDto> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshTokenStr, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const userId = (payload.sub ?? payload.id) as AutoIncrementID;
    const sessionId = (payload.sid ?? payload.sessionId) as AutoIncrementID;

    const session = await this.authSessionService.getSessionById(sessionId);

    if (
      !session ||
      String(session.userId) !== String(userId) ||
      session.isRevoked
    ) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const user = await this.userService.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is no longer active');
    }

    const targetDomain = domain ?? user.domain;
    const newHash = crypto.randomBytes(32).toString('hex');
    await this.authSessionService.rotateSessionHash(session.id, newHash);

    const tokens = await this.createTokens({
      id: user.id,
      domain: targetDomain,
      sessionId: session.id,
      hash: newHash,
    });

    return plainToInstance(RefreshResDto, {
      userId: user.id,
      ...tokens,
    });
  }

  async logout(
    userId: AutoIncrementID | string,
    sessionId: AutoIncrementID | string,
  ): Promise<void> {
    await this.authSessionService.revokeSession({
      sessionId,
      userId,
      userType: DomainType.ADMIN,
    });
  }

  async sendVerificationEmail(
    user: UserEntity,
    domain: DomainType,
  ): Promise<void> {
    const payload: CustomTokenPayload = {
      sub: user.id,
      email: user.email,
      domain,
      type: 'email-verification',
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
        infer: true,
      }),
      expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
        infer: true,
      }) as unknown as JwtSignOptions['expiresIn'],
    });

    if (domain === DomainType.ADMIN) {
      await this.emailQueueService.sendAdminEmailVerification({
        email: user.email,
        token,
      });
    } else {
      await this.emailQueueService.sendUserEmailVerification({
        email: user.email,
        token,
      });
    }
  }

  async verifyEmail(
    token: string,
    domain: DomainType,
  ): Promise<{ message: string }> {
    let payload: CustomTokenPayload;

    try {
      payload = this.jwtService.verify<CustomTokenPayload>(token, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new BadRequestException(
        'Verification token is invalid or has expired',
      );
    }

    if (payload.domain && payload.domain !== domain) {
      throw new BadRequestException(
        'Verification token is invalid for this domain',
      );
    }

    const user = await this.userService.findById(
      payload.sub as AutoIncrementID,
    );
    if (!user || user.domain !== domain) {
      throw new BadRequestException('User account not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    user.isEmailVerified = true;
    user.verifiedAt = new Date();
    await this.userService.save(user);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    dto: ResendEmailVerifyReqDto,
    domain: DomainType,
  ): Promise<{ message: string }> {
    const user = await this.userService.findByEmailAndDomain(dto.email, domain);

    if (!user) {
      return {
        message:
          'If your email is registered, verification instructions have been sent.',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('This email is already verified');
    }

    await this.sendVerificationEmail(user, domain);

    return { message: 'Verification email sent successfully' };
  }

  async forgotPassword(
    dto: ForgotPasswordReqDto,
    domain: DomainType,
  ): Promise<{ message: string }> {
    const user = await this.userService.findByEmailAndDomain(dto.email, domain);

    if (user && user.status === UserStatus.ACTIVE) {
      const payload: CustomTokenPayload = {
        sub: user.id,
        email: user.email,
        domain,
        type: 'forgot-password',
      };

      const token = this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.forgotExpires', {
          infer: true,
        }) as unknown as JwtSignOptions['expiresIn'],
      });

      if (domain === DomainType.ADMIN) {
        await this.emailQueueService.sendAdminEmailForgotPassword({
          email: user.email,
          token,
        });
      } else {
        await this.emailQueueService.sendUserEmailForgotPassword({
          email: user.email,
          token,
        });
      }
    }

    return {
      message:
        'If your email is registered, password reset instructions have been sent.',
    };
  }

  async resetPassword(
    dto: { token: string; password?: string } | ResetPasswordReqDto,
    domain: DomainType,
  ): Promise<{ message: string }> {
    let payload: CustomTokenPayload;

    const token = 'token' in dto ? (dto as any).token : '';
    const password = dto.password;

    if (!token || !password) {
      throw new BadRequestException('Token and password are required');
    }

    try {
      payload = this.jwtService.verify<CustomTokenPayload>(token, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new BadRequestException(
        'Password reset token is invalid or has expired',
      );
    }

    if (payload.domain && payload.domain !== domain) {
      throw new BadRequestException(
        'Password reset token is invalid for this domain',
      );
    }

    const user = await this.userService.findById(
      payload.sub as AutoIncrementID,
    );
    if (!user || user.domain !== domain) {
      throw new BadRequestException('User account not found');
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await this.userService.save(user);

    await this.authSessionService.revokeAllUserSessions(user.id);

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(
    userId: AutoIncrementID,
    dto: IChangePasswordParams,
  ): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPassword =
      dto.password ?? dto.oldPassword ?? dto.currentPassword;
    const newPassword = dto.newPassword;

    if (!newPassword) {
      throw new BadRequestException('New password is required');
    }

    if (user.password) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const isMatch = await verifyPassword(currentPassword, user.password);
      if (!isMatch) {
        throw new ValidationException(ErrorCode.V003);
      }
    }

    user.password = await hashPassword(newPassword);
    await this.userService.save(user);

    return { message: 'Password changed successfully' };
  }

  private async createAuthResponse(
    user: UserEntity,
    domain: DomainType,
    requestInfo?: SessionRequestInfo,
  ) {
    const refreshTokenHash = crypto.randomBytes(32).toString('hex');
    const session = await this.authSessionService.createLoginSession({
      userId: user.id,
      userType: domain,
      hash: refreshTokenHash,
      requestInfo,
    });

    const tokens = await this.createTokens({
      id: user.id,
      domain,
      sessionId: session.id,
      hash: refreshTokenHash,
    });

    const roles = user.roles?.map((r) => r.name) ?? [];

    return {
      userId: user.id,
      ...tokens,
      roles,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        domain: user.domain,
        roles,
      },
    };
  }

  private async createTokens(data: {
    id: AutoIncrementID;
    domain: DomainType;
    sessionId: AutoIncrementID;
    hash: string;
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          sub: data.id,
          domain: data.domain,
          sessionId: data.sessionId,
          sid: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn as StringValue,
        },
      ),
      this.jwtService.signAsync(
        {
          id: data.id,
          sub: data.id,
          domain: data.domain,
          sessionId: data.sessionId,
          sid: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }) as StringValue,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenExpires,
    };
  }
}
