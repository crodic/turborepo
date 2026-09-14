import { UserAccountEntity } from '@/api/user/entities/user-account.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { IEmailJob } from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { EAccountProvider } from '@/constants/entity.enum';
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

@Injectable()
export class UserAccountRecoveryService extends AccountRecoveryService<UserEntity> {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    authRecoveryService: AuthRecoveryService,
    @InjectRepository(UserEntity)
    userRepository: Repository<UserEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectQueue(QueueName.EMAIL)
    emailQueue: Queue<IEmailJob, any, string>,
  ) {
    super(authRecoveryService, userRepository, emailQueue);
  }

  protected getRecoveryConfig(): AccountRecoveryConfig {
    return {
      confirmEmailSecret: this.configService.getOrThrow(
        'auth.userConfirmEmailSecret',
        { infer: true },
      ),
      confirmEmailExpires: this.configService.getOrThrow(
        'auth.userConfirmEmailExpires',
        { infer: true },
      ),
      forgotSecret: this.configService.getOrThrow('auth.userForgotSecret', {
        infer: true,
      }),
      forgotExpires: this.configService.getOrThrow('auth.userForgotExpires', {
        infer: true,
      }),
      resetPasswordUrl: this.configService.getOrThrow(
        'auth.clientResetPasswordUrl',
        { infer: true },
      ),
      emailVerificationJob: JobName.USER_EMAIL_VERIFICATION,
      forgotPasswordJob: JobName.USER_EMAIL_FORGOT_PASSWORD,
    };
  }

  protected async saveLocalAccountPassword(
    user: UserEntity,
    password: string,
  ): Promise<void> {
    let localAccount = await this.userAccountRepository.findOne({
      where: { userId: user.id, provider: EAccountProvider.LOCAL },
    });

    if (!localAccount) {
      localAccount = new UserAccountEntity({
        userId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password,
        email: user.email,
      });
    } else {
      localAccount.password = password;
    }

    await this.userAccountRepository.save(localAccount);
  }
}
