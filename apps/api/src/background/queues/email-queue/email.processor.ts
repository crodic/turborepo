import {
  IAdminSendEmailJob,
  IAdminSuspiciousLoginEmailJob,
  IEmailJob,
  IForgotPasswordEmailJob,
  IUserImpersonationEndedEmailJob,
  IUserImpersonationStartedEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { JobName, QueueName } from '@/constants/job.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailQueueService } from './email-queue.service';

@Processor(QueueName.EMAIL, {
  concurrency: 1,
  drainDelay: 300,
  stalledInterval: 300000,
  removeOnComplete: {
    age: 86400,
    count: 100,
  },
  limiter: {
    max: 1,
    duration: 150,
  },
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  constructor(private readonly emailQueueService: EmailQueueService) {
    super();
  }
  async process(
    job: Job<IEmailJob, any, string>,
    _token?: string,
  ): Promise<any> {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );

    switch (job.name) {
      case JobName.ADMIN_EMAIL_VERIFICATION:
        return await this.emailQueueService.sendAdminEmailVerification(
          job.data as unknown as IVerifyEmailJob,
        );
      case JobName.ADMIN_EMAIL_FORGOT_PASSWORD:
        return await this.emailQueueService.sendAdminEmailForgotPassword(
          job.data as unknown as IForgotPasswordEmailJob,
        );
      case JobName.ADMIN_SUSPICIOUS_LOGIN:
        return await this.emailQueueService.sendAdminSuspiciousLogin(
          job.data as unknown as IAdminSuspiciousLoginEmailJob,
        );
      case JobName.USER_EMAIL_VERIFICATION:
        return await this.emailQueueService.sendUserEmailVerification(
          job.data as unknown as IVerifyEmailJob,
        );
      case JobName.USER_EMAIL_FORGOT_PASSWORD:
        return await this.emailQueueService.sendUserEmailForgotPassword(
          job.data as unknown as IForgotPasswordEmailJob,
        );
      case JobName.USER_IMPERSONATION_STARTED:
        return await this.emailQueueService.sendUserImpersonationStarted(
          job.data as unknown as IUserImpersonationStartedEmailJob,
        );
      case JobName.USER_IMPERSONATION_ENDED:
        return await this.emailQueueService.sendUserImpersonationEnded(
          job.data as unknown as IUserImpersonationEndedEmailJob,
        );
      case JobName.EMAIL_VERIFICATION:
        return await this.emailQueueService.sendUserEmailVerification(
          job.data as unknown as IVerifyEmailJob,
        );
      case JobName.EMAIL_FORGOT_PASSWORD:
        return await this.emailQueueService.sendUserEmailForgotPassword(
          job.data as unknown as IForgotPasswordEmailJob,
        );
      case JobName.ADMIN_SEND_EMAIL:
        return await this.emailQueueService.sendAdminEmail(
          job.data as unknown as IAdminSendEmailJob,
        );
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('active')
  async onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('progress')
  async onProgress(job: Job) {
    this.logger.debug(`Job ${job.id} is ${job.progress}% complete`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has been completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    this.logger.error(
      `Job ${job.id} has failed with reason: ${job.failedReason}`,
    );
    this.logger.error(job.stacktrace);
  }

  @OnWorkerEvent('stalled')
  async onStalled(job: Job) {
    this.logger.error(`Job ${job.id} has been stalled`);
  }

  @OnWorkerEvent('error')
  async onError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} has failed with error: ${error.message}`);
  }
}
