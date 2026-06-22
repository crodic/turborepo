import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import {
  IAdminSendEmailJob,
  IForgotPasswordEmailJob,
  IUserImpersonationEndedEmailJob,
  IUserImpersonationStartedEmailJob,
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
    private readonly notificationService: NotificationService,
  ) {}

  async sendAdminEmailVerification(data: IVerifyEmailJob): Promise<void> {
    this.logger.debug(`Sending admin email verification to ${data.email}`);
    const renderedBody = this.mailService.renderAdminEmailVerification(
      data.email,
      data.token,
    );
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'Verify your admin account',
      jobName: JobName.ADMIN_EMAIL_VERIFICATION,
      templateName: 'admin-email-verification',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendAdminEmailVerification(
        data.email,
        data.token,
        renderedBody,
      );
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendAdminEmailForgotPassword(
    data: IForgotPasswordEmailJob,
  ): Promise<void> {
    this.logger.debug(`Sending admin forgot password to ${data.email}`);
    const renderedBody = this.mailService.renderAdminEmailForgotPassword(
      data.email,
      data.token,
    );
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'Reset your admin password',
      jobName: JobName.ADMIN_EMAIL_FORGOT_PASSWORD,
      templateName: 'admin-email-reset-password',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendAdminEmailForgotPassword(
        data.email,
        data.token,
        renderedBody,
      );
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendUserEmailVerification(data: IVerifyEmailJob): Promise<void> {
    this.logger.debug(`Sending user email verification to ${data.email}`);
    const renderedBody = this.mailService.renderUserEmailVerification(
      data.email,
      data.token,
    );
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'Verify your account',
      jobName: JobName.USER_EMAIL_VERIFICATION,
      templateName: 'user-email-verification',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendUserEmailVerification(
        data.email,
        data.token,
        renderedBody,
      );
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendUserEmailForgotPassword(
    data: IForgotPasswordEmailJob,
  ): Promise<void> {
    this.logger.debug(`Sending user forgot password to ${data.email}`);
    const renderedBody = this.mailService.renderUserEmailForgotPassword(
      data.email,
      data.token,
    );
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'Reset your password',
      jobName: JobName.USER_EMAIL_FORGOT_PASSWORD,
      templateName: 'user-email-reset-password',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendUserEmailForgotPassword(
        data.email,
        data.token,
        renderedBody,
      );
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendUserImpersonationStarted(
    data: IUserImpersonationStartedEmailJob,
  ): Promise<void> {
    this.logger.debug(`Sending impersonation started email to ${data.email}`);
    const renderedBody = this.mailService.renderUserImpersonationStarted(data);
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'An administrator started a support session',
      jobName: JobName.USER_IMPERSONATION_STARTED,
      templateName: 'user-impersonation-started',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendUserImpersonationStarted({
        ...data,
        renderedHtml: renderedBody,
      });
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendUserImpersonationEnded(
    data: IUserImpersonationEndedEmailJob,
  ): Promise<void> {
    this.logger.debug(`Sending impersonation ended email to ${data.email}`);
    const renderedBody = this.mailService.renderUserImpersonationEnded(data);
    const log = await this.createSystemLog({
      to: [data.email],
      subject: 'Administrator support session ended',
      jobName: JobName.USER_IMPERSONATION_ENDED,
      templateName: 'user-impersonation-ended',
      body: renderedBody,
      renderedBody,
    });

    try {
      await this.mailService.sendUserImpersonationEnded({
        ...data,
        renderedHtml: renderedBody,
      });
      await this.markSent(log, renderedBody);
    } catch (error) {
      await this.markFailed(log, error);
      throw error;
    }
  }

  async sendAdminEmail(data: IAdminSendEmailJob): Promise<void> {
    const emailLog = await this.emailLogRepository.findOneBy({
      id: data.emailLogId,
    });

    if (!emailLog || emailLog.status === EEmailLogStatus.CANCELLED) {
      return;
    }

    try {
      const renderedBody = this.mailService.renderAdminEmail({
        subject: emailLog.subject,
        body: emailLog.body ?? '',
      });
      emailLog.renderedBody = renderedBody;
      await this.emailLogRepository.save(emailLog);
      await this.mailService.sendAdminEmail({
        to: emailLog.to,
        cc: emailLog.cc,
        bcc: emailLog.bcc,
        subject: emailLog.subject,
        body: emailLog.body ?? '',
        renderedHtml: renderedBody,
      });
      await this.markSent(emailLog, renderedBody);
      await this.notifyEmailStatus(
        emailLog,
        AdminNotificationType.EmailSent,
        'Email sent',
        `Your email "${emailLog.subject}" was sent successfully.`,
      );
    } catch (error) {
      await this.markFailed(emailLog, error);
      await this.notifyEmailStatus(
        emailLog,
        AdminNotificationType.EmailFailed,
        'Email failed',
        `Your email "${emailLog.subject}" failed to send.`,
      );
      throw error;
    }
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

  private async notifyEmailStatus(
    emailLog: EmailLogEntity,
    type: AdminNotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    if (!emailLog.createdByAdminId) {
      return;
    }

    try {
      await this.notificationService.createForAdmin({
        adminId: emailLog.createdByAdminId,
        type,
        title,
        message,
        data: {
          emailLogId: emailLog.id,
          subject: emailLog.subject,
          status: emailLog.status,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create email notification: ${error}`);
    }
  }
}
