import { AdminAccountEntity } from '@/api/admin-user/entities/admin-account.entity';
import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { IEmailJob } from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { EAccountProvider, ESessionUserType } from '@/constants/entity.enum';
import { JobName, QueueName } from '@/constants/job.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  AccountRecoveryConfig,
  AccountRecoveryService,
} from './account-recovery.service';
import { AuthRecoveryService } from './auth-recovery.service';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class AdminAccountRecoveryService extends AccountRecoveryService<AdminUserEntity> {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    authRecoveryService: AuthRecoveryService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @InjectQueue(QueueName.EMAIL)
    emailQueue: Queue<IEmailJob, any, string>,
    private readonly notificationService: NotificationService,
    private readonly authSessionService: AuthSessionService,
  ) {
    super(authRecoveryService, adminUserRepository, emailQueue);
  }

  protected getRecoveryConfig(): AccountRecoveryConfig {
    return {
      scope: ESessionUserType.ADMIN,
      confirmEmailSecret: this.configService.getOrThrow(
        'auth.confirmEmailSecret',
        { infer: true },
      ),
      confirmEmailExpires: this.configService.getOrThrow(
        'auth.confirmEmailExpires',
        { infer: true },
      ),
      forgotSecret: this.configService.getOrThrow('auth.forgotSecret', {
        infer: true,
      }),
      forgotExpires: this.configService.getOrThrow('auth.forgotExpires', {
        infer: true,
      }),
      resetPasswordUrl: this.configService.getOrThrow(
        'auth.portalResetPasswordUrl',
        { infer: true },
      ),
      emailVerificationJob: JobName.ADMIN_EMAIL_VERIFICATION,
      forgotPasswordJob: JobName.ADMIN_EMAIL_FORGOT_PASSWORD,
    };
  }

  protected async saveLocalAccountPassword(
    user: AdminUserEntity,
    password: string,
  ): Promise<void> {
    let localAccount = await this.adminAccountRepository.findOne({
      where: { adminUserId: user.id, provider: EAccountProvider.LOCAL },
    });

    if (!localAccount) {
      localAccount = new AdminAccountEntity({
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password,
      });
    } else {
      localAccount.password = password;
    }

    await this.adminAccountRepository.save(localAccount);
  }

  protected override async onPasswordResetSuccess(
    user: AdminUserEntity,
  ): Promise<void> {
    // Revoke all existing sessions for this admin upon password reset
    await this.authSessionService.revokeAllUserSessions({
      userId: user.id,
      userType: ESessionUserType.ADMIN,
    });

    await this.notificationService.notifyAdmin(
      user.id,
      AdminNotificationType.PasswordReset,
      'Password reset completed',
      'Your admin account password was reset successfully.',
    );
  }
}
