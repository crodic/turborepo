import {
  IEmailJob,
  IForgotPasswordEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { ForgotPasswordResDto } from '../dto/forgot-password.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResendEmailVerifyResDto } from '../dto/resend-email-verify.res.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { ResetPasswordResDto } from '../dto/reset-password.res.dto';
import { VerifyAccountResDto } from '../dto/verify-account.res.dto';
import { IAuthUser } from '../interfaces/auth-entity.interface';
import { AuthRecoveryService } from './auth-recovery.service';

export interface AccountRecoveryConfig {
  scope: ESessionUserType;
  confirmEmailSecret: string;
  confirmEmailExpires: string;
  forgotSecret: string;
  forgotExpires: string;
  resetPasswordUrl: string;
  emailVerificationJob: JobName;
  forgotPasswordJob: JobName;
}

export abstract class AccountRecoveryService<
  TUser extends ObjectLiteral & IAuthUser,
> {
  constructor(
    protected readonly authRecoveryService: AuthRecoveryService,
    protected readonly userRepository: Repository<TUser>,
    protected readonly emailQueue: Queue<IEmailJob, any, string>,
  ) {}

  protected abstract getRecoveryConfig(): AccountRecoveryConfig;

  protected abstract saveLocalAccountPassword(
    user: TUser,
    password: string,
  ): Promise<void>;

  protected async onPasswordResetSuccess?(user: TUser): Promise<void>;

  async sendVerificationEmail(user: TUser): Promise<void> {
    const config = this.getRecoveryConfig();
    const { token } =
      await this.authRecoveryService.createAndCacheVerificationToken({
        userId: user.id,
        scope: config.scope,
        secret: config.confirmEmailSecret,
        expiresIn: config.confirmEmailExpires,
        cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
      });

    await this.emailQueue.add(
      config.emailVerificationJob,
      {
        email: user.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  async verifyAccount(token: string): Promise<VerifyAccountResDto> {
    const config = this.getRecoveryConfig();
    const { id } = await this.authRecoveryService.verifyAndConsumeToken({
      token,
      scope: config.scope,
      secret: config.confirmEmailSecret,
      cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
    });

    const user = await this.userRepository.findOneBy({
      id: id as AutoIncrementID,
    } as FindOptionsWhere<TUser>);

    if (!user) {
      throw new BadRequestException();
    }

    user.verifiedAt = new Date();
    await this.userRepository.save(user);

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
      where: { email: dto.email } as FindOptionsWhere<TUser>,
    });

    if (user) {
      await this.sendVerificationEmail(user);
    }

    return plainToInstance(ResendEmailVerifyResDto, {
      userId: user?.id,
    });
  }

  async forgotPassword(
    dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email } as FindOptionsWhere<TUser>,
    });

    if (!user) {
      throw new ValidationException(ErrorCode.E004);
    }

    const config = this.getRecoveryConfig();
    const { token } =
      await this.authRecoveryService.createAndCacheVerificationToken({
        userId: user.id,
        scope: config.scope,
        secret: config.forgotSecret,
        expiresIn: config.forgotExpires,
        cacheKeyPrefix: CacheKey.FORGOT_PASSWORD,
      });

    await this.emailQueue.add(
      config.forgotPasswordJob,
      {
        email: dto.email,
        token,
      } as IForgotPasswordEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    // SECURITY: Do NOT return the reset token to the client in the HTTP response.
    // The reset token must only be delivered out-of-band via verified email.
    return plainToInstance(ForgotPasswordResDto, {
      message: 'A password reset link has been sent to your email.',
    });
  }

  async resetPassword(
    token: string,
    dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const config = this.getRecoveryConfig();
    const { id } = await this.authRecoveryService.verifyAndConsumeToken({
      token,
      scope: config.scope,
      secret: config.forgotSecret,
      cacheKeyPrefix: CacheKey.FORGOT_PASSWORD,
    });

    const user = await this.userRepository.findOneBy({
      id: id as AutoIncrementID,
    } as FindOptionsWhere<TUser>);

    if (!user) {
      throw new BadRequestException();
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException();
    }

    await this.saveLocalAccountPassword(user, dto.password);

    if (this.onPasswordResetSuccess) {
      await this.onPasswordResetSuccess(user);
    }

    return plainToInstance(ResetPasswordResDto, {
      success: true,
      message: 'Reset password successfully. Please login to continue website',
    });
  }
}
