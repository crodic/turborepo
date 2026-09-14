import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import {
  IAdminAccountDeletionRequestedEmailJob,
  IAdminAccountHardDeletedEmailJob,
  IAdminAccountHardDeletedReportEmailJob,
  IForgotPasswordEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { EEmailLogSource, EEmailLogStatus } from '@/constants/entity.enum';
import { JobName } from '@/constants/job.constant';
import { MailService } from '@/mail/mail.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: Repository<EmailLogEntity>,
  ) {}

  private async dispatchEmailJob(options: {
    debugMessage: string;
    to: string | string[];
    subject: string;
    jobName: JobName;
    templateName: string;
    render: () => string;
    send: (renderedBody: string) => Promise<unknown>;
  }): Promise<void> {
    this.logger.debug(options.debugMessage);
    const renderedBody = options.render();
    const log = await this.createSystemLog({
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      jobName: options.jobName,
      templateName: options.templateName,
      body: renderedBody,
      renderedBody,
    });

    try {
      await options.send(renderedBody);
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendAdminEmailVerification(data: IVerifyEmailJob): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending admin email verification to ${data.email}`,
      to: data.email,
      subject: 'Verify your admin account',
      jobName: JobName.ADMIN_EMAIL_VERIFICATION,
      templateName: 'admin-email-verification',
      render: () =>
        this.mailService.renderAdminEmailVerification(data.email, data.token),
      send: (renderedBody) =>
        this.mailService.sendAdminEmailVerification(
          data.email,
          data.token,
          renderedBody,
        ),
    });
  }

  async sendAdminEmailForgotPassword(
    data: IForgotPasswordEmailJob,
  ): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending admin forgot password to ${data.email}`,
      to: data.email,
      subject: 'Reset your admin password',
      jobName: JobName.ADMIN_EMAIL_FORGOT_PASSWORD,
      templateName: 'admin-email-reset-password',
      render: () =>
        this.mailService.renderAdminEmailForgotPassword(data.email, data.token),
      send: (renderedBody) =>
        this.mailService.sendAdminEmailForgotPassword(
          data.email,
          data.token,
          renderedBody,
        ),
    });
  }

  async sendAdminAccountDeletionRequested(
    data: IAdminAccountDeletionRequestedEmailJob,
  ): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending admin account deletion requested alert to ${data.email}`,
      to: data.email,
      subject: 'Account Deletion Requested',
      jobName: JobName.ADMIN_ACCOUNT_DELETION_REQUESTED,
      templateName: 'admin-account-deletion-requested',
      render: () =>
        this.mailService.renderAdminAccountDeletionRequested(
          data.adminName,
          data.deletionDate,
        ),
      send: (renderedBody) =>
        this.mailService.sendAdminAccountDeletionRequested(
          data.email,
          data.adminName,
          data.deletionDate,
          renderedBody,
        ),
    });
  }

  async sendAdminAccountHardDeleted(
    data: IAdminAccountHardDeletedEmailJob,
  ): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending admin account hard deleted alert to ${data.email}`,
      to: data.email,
      subject: 'Your account has been deleted',
      jobName: JobName.ADMIN_ACCOUNT_HARD_DELETED,
      templateName: 'admin-account-hard-deleted',
      render: () =>
        this.mailService.renderAdminAccountHardDeleted(
          data.adminName,
          data.deletedAt,
        ),
      send: (renderedBody) =>
        this.mailService.sendAdminAccountHardDeleted(
          data.email,
          data.adminName,
          data.deletedAt,
          renderedBody,
        ),
    });
  }

  async sendAdminAccountHardDeletedReport(
    data: IAdminAccountHardDeletedReportEmailJob,
  ): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending admin account hard deleted report to ${data.email}`,
      to: data.email,
      subject: `Admin Account Deletion Report (${data.deletedCount} deleted)`,
      jobName: JobName.ADMIN_ACCOUNT_HARD_DELETED_REPORT,
      templateName: 'admin-account-hard-deleted-report',
      render: () =>
        this.mailService.renderAdminAccountHardDeletedReport(
          data.adminName,
          data.deletedCount,
        ),
      send: (renderedBody) =>
        this.mailService.sendAdminAccountHardDeletedReport(
          data.email,
          data.adminName,
          data.deletedCount,
          renderedBody,
        ),
    });
  }

  async sendUserEmailVerification(data: IVerifyEmailJob): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending user email verification to ${data.email}`,
      to: data.email,
      subject: 'Verify your account',
      jobName: JobName.USER_EMAIL_VERIFICATION,
      templateName: 'user-email-verification',
      render: () =>
        this.mailService.renderUserEmailVerification(data.email, data.token),
      send: (renderedBody) =>
        this.mailService.sendUserEmailVerification(
          data.email,
          data.token,
          renderedBody,
        ),
    });
  }

  async sendUserEmailForgotPassword(
    data: IForgotPasswordEmailJob,
  ): Promise<void> {
    return this.dispatchEmailJob({
      debugMessage: `Sending user forgot password to ${data.email}`,
      to: data.email,
      subject: 'Reset your password',
      jobName: JobName.USER_EMAIL_FORGOT_PASSWORD,
      templateName: 'user-email-reset-password',
      render: () =>
        this.mailService.renderUserEmailForgotPassword(data.email, data.token),
      send: (renderedBody) =>
        this.mailService.sendUserEmailForgotPassword(
          data.email,
          data.token,
          renderedBody,
        ),
    });
  }

  private async createSystemLog(params: {
    to: string[];
    subject: string;
    jobName: JobName;
    templateName: string;
    body?: string;
    renderedBody?: string;
  }): Promise<EmailLogEntity | undefined> {
    try {
      const log = this.emailLogRepository.create({
        source: EEmailLogSource.SYSTEM,
        status: EEmailLogStatus.SCHEDULED,
        from: this.getDefaultFrom(),
        to: params.to,
        subject: params.subject,
        jobName: params.jobName,
        templateName: params.templateName,
        body: params.body,
        renderedBody: params.renderedBody,
      });

      return await this.emailLogRepository.save(log);
    } catch (error) {
      this.logger.warn(`Failed to create system email log: ${error}`);
      return undefined;
    }
  }

  private async markSent(
    emailLog?: EmailLogEntity,
    renderedBody?: string,
  ): Promise<void> {
    if (!emailLog) {
      return;
    }

    try {
      emailLog.status = EEmailLogStatus.SENT;
      emailLog.sentAt = new Date();
      emailLog.errorMessage = null;
      emailLog.failedAt = null;
      if (renderedBody) {
        emailLog.renderedBody = renderedBody;
      }
      emailLog.attempts = (emailLog.attempts ?? 0) + 1;
      await this.emailLogRepository.save(emailLog);
    } catch (error) {
      this.logger.warn(`Failed to update sent email log: ${error}`);
    }
  }

  private async markFailed(
    emailLog: EmailLogEntity | undefined,
    error: unknown,
  ): Promise<void> {
    if (!emailLog) {
      return;
    }

    try {
      emailLog.status = EEmailLogStatus.FAILED;
      emailLog.failedAt = new Date();
      emailLog.errorMessage =
        error instanceof Error ? error.message : String(error);
      emailLog.attempts = (emailLog.attempts ?? 0) + 1;
      await this.emailLogRepository.save(emailLog);
    } catch (updateError) {
      this.logger.warn(`Failed to update failed email log: ${updateError}`);
    }
  }

  private getDefaultFrom(): string {
    const name = this.configService.get('mail.defaultName', { infer: true });
    const email = this.configService.get('mail.defaultEmail', { infer: true });

    return name ? `"${name}" <${email}>` : email;
  }
}
