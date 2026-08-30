import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import { Repository } from 'typeorm';

import { UserEntity } from '@/api/user/entities/user.entity';
import {
  IEmailJob,
  IForgotPasswordEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';

import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { ForgotPasswordResDto } from '../dto/forgot-password.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResendEmailVerifyResDto } from '../dto/resend-email-verify.res.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { ResetPasswordResDto } from '../dto/reset-password.res.dto';
import { VerifyAccountResDto } from '../dto/verify-account.req.dto';
import { JwtForgotPasswordPayload } from '../types/jwt-forgot-password-payload';

@Injectable()
export class UserAccountRecoveryService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createVerificationToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.userConfirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow(
          'auth.userConfirmEmailExpires',
          {
            infer: true,
          },
        ),
      },
    );
  }

  async sendVerificationEmail(user: UserEntity): Promise<void> {
    const token = await this.createVerificationToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.userConfirmEmailExpires',
      {
        infer: true,
      },
    );
    await this.cacheManager.set(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );
    await this.emailQueue.add(
      JobName.USER_EMAIL_VERIFICATION,
      {
        email: user.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  verifyEmailToken(token: string): JwtForgotPasswordPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userConfirmEmailSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException('URL không còn khả dụng', HttpStatus.GONE);
    }
  }

  async verifyAccount(token: string): Promise<VerifyAccountResDto> {
    const { id } = this.verifyEmailToken(token);

    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new BadRequestException();
    }

    user.verifiedAt = new Date();
    await user.save();

    await this.cacheManager.del(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, id),
    );

    return plainToInstance(VerifyAccountResDto, {
      verified: true,
      message: 'Your account has been verified',
      userId: user.id,
    });
  }

  async resendVerifyEmail(
    dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (user) {
      await this.sendVerificationEmail(user);
    }

    return plainToInstance(ResendEmailVerifyResDto, {
      userId: user?.id,
    });
  }

  async createForgotToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.userForgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.userForgotExpires', {
          infer: true,
        }),
      },
    );
  }

  verifyForgotPasswordToken(token: string): JwtForgotPasswordPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userForgotSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException('URL không còn khả dụng', HttpStatus.GONE);
    }
  }

  async forgotPassword(
    dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ValidationException(ErrorCode.E004);
    }

    const token = await this.createForgotToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.userForgotExpires',
      {
        infer: true,
      },
    );

    await this.cacheManager.set(
      createCacheKey(CacheKey.FORGOT_PASSWORD, user.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );

    await this.emailQueue.add(
      JobName.USER_EMAIL_FORGOT_PASSWORD,
      {
        email: dto.email,
        token,
      } as IForgotPasswordEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    const clientResetPasswordUrl = this.configService.getOrThrow(
      'auth.clientResetPasswordUrl',
      {
        infer: true,
      },
    );

    return plainToInstance(ForgotPasswordResDto, {
      redirect: `${clientResetPasswordUrl}?token=${token}`,
    });
  }

  async resetPassword(
    token: string,
    dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const { id } = this.verifyForgotPasswordToken(token);

    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new BadRequestException();
    }

    await this.cacheManager.del(createCacheKey(CacheKey.FORGOT_PASSWORD, id));

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException();
    }

    user.password = dto.password;

    await user.save();

    return plainToInstance(ResetPasswordResDto, {
      success: true,
      message: 'Reset password successfully. Please login to continue website',
    });
  }
}
