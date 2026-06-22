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

  renderUserImpersonationStarted(params: {
    email: string;
    userName?: string;
    adminName?: string;
    reason?: string;
    startedAt: string;
    expiresAt?: string;
  }): string {
    return this.renderTemplate('user-impersonation-started', {
      ...params,
      startedAt: formatEmailDate(params.startedAt),
      expiresAt: params.expiresAt ? formatEmailDate(params.expiresAt) : '',
    });
  }

  async sendUserImpersonationStarted(params: {
    email: string;
    userName?: string;
    adminName?: string;
    reason?: string;
    startedAt: string;
    expiresAt?: string;
    renderedHtml?: string;
  }): Promise<string> {
    const html =
      params.renderedHtml ?? this.renderUserImpersonationStarted(params);

    await this.mailerService.sendMail({
      to: params.email,
      subject: 'An administrator started a support session',
      html,
    });

    return html;
  }

  renderUserImpersonationEnded(params: {
    email: string;
    userName?: string;
    adminName?: string;
    startedAt?: string;
    endedAt: string;
    actions: { label: string; status: string; createdAt?: string }[];
  }): string {
    return this.renderTemplate('user-impersonation-ended', {
      ...params,
      startedAt: params.startedAt ? formatEmailDate(params.startedAt) : '',
      endedAt: formatEmailDate(params.endedAt),
      actions: params.actions.map((action) => ({
        ...action,
        createdAt: action.createdAt ? formatEmailDate(action.createdAt) : '',
      })),
      hasActions: params.actions.length > 0,
    });
  }

  async sendUserImpersonationEnded(params: {
    email: string;
    userName?: string;
    adminName?: string;
    startedAt?: string;
    endedAt: string;
    actions: { label: string; status: string; createdAt?: string }[];
    renderedHtml?: string;
  }): Promise<string> {
    const html =
      params.renderedHtml ?? this.renderUserImpersonationEnded(params);

    await this.mailerService.sendMail({
      to: params.email,
      subject: 'Administrator support session ended',
      html,
    });

    return html;
  }

  renderAdminEmail(params: {
    subject: string;
    body: string;
    logoUrl?: string | null;
  }): string {
    return this.renderTemplate('admin-email', {
      subject: params.subject,
      body: params.body,
      logoUrl: params.logoUrl,
    });
  }

  async sendAdminEmail(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    logoUrl?: string | null;
    renderedHtml?: string;
  }): Promise<string> {
    const html = params.renderedHtml ?? this.renderAdminEmail(params);

    await this.mailerService.sendMail({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
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
      | 'user-impersonation-started'
      | 'user-impersonation-ended'
      | 'admin-email',
    context: Record<string, unknown>,
  ): string {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const template = readFileSync(templatePath, 'utf8');

    return Handlebars.compile(template, { strict: true })(context);
  }
}

function formatEmailDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}
