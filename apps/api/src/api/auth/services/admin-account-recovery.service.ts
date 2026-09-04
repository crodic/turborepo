import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

import { AdminAccountEntity } from '@/api/admin-user/entities/admin-account.entity';
import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import {
  IEmailJob,
  IForgotPasswordEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { EAccountProvider } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';

import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { ForgotPasswordResDto } from '../dto/forgot-password.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResendEmailVerifyResDto } from '../dto/resend-email-verify.res.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { ResetPasswordResDto } from '../dto/reset-password.res.dto';
import { VerifyAccountResDto } from '../dto/verify-account.req.dto';
import { AuthRecoveryService } from './auth-recovery.service';

@Injectable()
export class AdminAccountRecoveryService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly authRecoveryService: AuthRecoveryService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    private readonly notificationService: NotificationService,
  ) {}

  async sendVerificationEmail(user: AdminUserEntity): Promise<void> {
    const { token } =
      await this.authRecoveryService.createAndCacheVerificationToken({
        userId: user.id,
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
        cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
      });

    await this.emailQueue.add(
      JobName.ADMIN_EMAIL_VERIFICATION,
      {
        email: user.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  async verifyAccount(token: string): Promise<VerifyAccountResDto> {
    const { id } = await this.authRecoveryService.verifyAndConsumeToken({
      token,
      secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
        infer: true,
      }),
      cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
    });

    const user = await this.adminUserRepository.findOneBy({
      id: id as AutoIncrementID,
    });

    if (!user) {
      throw new BadRequestException();
    }

    user.verifiedAt = new Date();
    await user.save();

    return plainToInstance(VerifyAccountResDto, {
      verified: true,
      message: 'Your account has been verified',
      userId: user.id,
    });
  }

  async resendVerifyEmail(
    dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    const user = await this.adminUserRepository.findOne({
      where: { email: dto.email },
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
    const admin = await this.adminUserRepository.findOneOrFail({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new ValidationException(ErrorCode.E004);
    }

    const { token } =
      await this.authRecoveryService.createAndCacheVerificationToken({
        userId: admin.id,
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.forgotExpires', {
          infer: true,
        }),
        cacheKeyPrefix: CacheKey.FORGOT_PASSWORD,
      });

    await this.emailQueue.add(
      JobName.ADMIN_EMAIL_FORGOT_PASSWORD,
      {
        email: dto.email,
        token,
      } as IForgotPasswordEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    const portalResetPasswordUrl = this.configService.getOrThrow(
      'auth.portalResetPasswordUrl',
      {
        infer: true,
      },
    );

    return plainToInstance(ForgotPasswordResDto, {
      redirect: `${portalResetPasswordUrl}?token=${token}`,
    });
  }

  async resetPassword(
    token: string,
    dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const { id } = await this.authRecoveryService.verifyAndConsumeToken({
      token,
      secret: this.configService.getOrThrow('auth.forgotSecret', {
        infer: true,
      }),
      cacheKeyPrefix: CacheKey.FORGOT_PASSWORD,
    });

    const user = await this.adminUserRepository.findOneBy({
      id: id as AutoIncrementID,
    });

    if (!user) {
      throw new BadRequestException();
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException();
    }

    let localAccount = await this.adminAccountRepository.findOne({
      where: { adminUserId: user.id, provider: EAccountProvider.LOCAL },
    });

    if (!localAccount) {
      localAccount = new AdminAccountEntity({
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: dto.password,
      });
    } else {
      localAccount.password = dto.password;
    }

    await this.adminAccountRepository.save(localAccount);
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.PasswordReset,
      'Password reset completed',
      'Your admin account password was reset successfully.',
    );

    return plainToInstance(ResetPasswordResDto, {
      success: true,
      message: 'Reset password successfully. Please login to continue website',
    });
  }

  private async notifyAdmin(
    adminId: AutoIncrementID | string,
    type: AdminNotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.notificationService.createForAdmin({
        adminId,
        type,
        title,
        message,
        data,
      });
    } catch {
      // Notification failure shouldn't fail the operation
    }
  }
}
