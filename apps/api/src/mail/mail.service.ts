import { AllConfigType } from '@/config/config.type';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly mailerService: MailerService,
  ) {}

  renderAdminEmailVerification(email: string, token: string): string {
    const url = `${this.configService.get('app.url', { infer: true })}/api/v1/auth/verify?token=${token}`;

    return this.renderTemplate('admin-email-verification', {
      email,
      url,
    });
  }

  async sendAdminEmailVerification(
    email: string,
    token: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ?? this.renderAdminEmailVerification(email, token);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your admin account',
      html,
    });

    return html;
  }

  renderAdminEmailForgotPassword(email: string, token: string): string {
    const portalResetPasswordUrl = this.configService.getOrThrow(
      'auth.portalResetPasswordUrl',
      {
        infer: true,
      },
    );
    const url = `${portalResetPasswordUrl}?token=${token}`;

    return this.renderTemplate('admin-email-reset-password', {
      email,
      url,
    });
  }

  async sendAdminEmailForgotPassword(
    email: string,
    token: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ?? this.renderAdminEmailForgotPassword(email, token);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your admin password',
      html,
    });

    return html;
  }

  renderUserEmailVerification(email: string, token: string): string {
    const url = `${this.configService.get('app.url', { infer: true })}/api/v1/user/auth/verify/email?token=${token}`;

    return this.renderTemplate('user-email-verification', {
      email,
      url,
    });
  }

  async sendUserEmailVerification(
    email: string,
    token: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html = renderedHtml ?? this.renderUserEmailVerification(email, token);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your account',
      html,
    });

    return html;
  }

  renderUserEmailForgotPassword(email: string, token: string): string {
    const clientResetPasswordUrl = this.configService.getOrThrow(
      'auth.clientResetPasswordUrl',
      {
        infer: true,
      },
    );
    const url = `${clientResetPasswordUrl}?token=${token}`;

    return this.renderTemplate('user-email-reset-password', {
      email,
      url,
    });
  }

  async sendUserEmailForgotPassword(
    email: string,
    token: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ?? this.renderUserEmailForgotPassword(email, token);

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your password',
      html,
    });

    return html;
  }

  renderAdminAccountDeletionRequested(
    adminName: string,
    deletionDate: string,
  ): string {
    return this.renderTemplate('admin-account-deletion-requested', {
      adminName,
      deletionDate,
    });
  }

  async sendAdminAccountDeletionRequested(
    email: string,
    adminName: string,
    deletionDate: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ??
      this.renderAdminAccountDeletionRequested(adminName, deletionDate);
    await this.mailerService.sendMail({
      to: email,
      subject: 'Account Deletion Requested',
      html,
    });
    return html;
  }

  renderAdminAccountHardDeleted(adminName: string, deletedAt: string): string {
    return this.renderTemplate('admin-account-hard-deleted', {
      adminName,
      deletedAt,
    });
  }

  async sendAdminAccountHardDeleted(
    email: string,
    adminName: string,
    deletedAt: string,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ?? this.renderAdminAccountHardDeleted(adminName, deletedAt);
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your account has been deleted',
      html,
    });
    return html;
  }

  renderAdminAccountHardDeletedReport(
    adminName: string,
    deletedCount: number,
  ): string {
    return this.renderTemplate('admin-account-hard-deleted-report', {
      adminName,
      deletedCount,
    });
  }

  async sendAdminAccountHardDeletedReport(
    email: string,
    adminName: string,
    deletedCount: number,
    renderedHtml?: string,
  ): Promise<string> {
    const html =
      renderedHtml ??
      this.renderAdminAccountHardDeletedReport(adminName, deletedCount);
    await this.mailerService.sendMail({
      to: email,
      subject: `Admin Account Deletion Report (${deletedCount} deleted)`,
      html,
    });
    return html;
  }

  private renderTemplate(
    templateName:
      | 'admin-email-verification'
      | 'admin-email-reset-password'
      | 'user-email-verification'
      | 'user-email-reset-password'
      | 'admin-email'
      | 'admin-account-deletion-requested'
      | 'admin-account-hard-deleted'
      | 'admin-account-hard-deleted-report',
    context: Record<string, unknown>,
  ): string {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const template = readFileSync(templatePath, 'utf8');

    return Handlebars.compile(template, { strict: true })(context);
  }
}
