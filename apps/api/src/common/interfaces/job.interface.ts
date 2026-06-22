import { AutoIncrementID } from '../types/common.type';

export interface IEmailJob {
  email: string;
}

export interface IVerifyEmailJob extends IEmailJob {
  token: string;
}

export interface IForgotPasswordEmailJob extends IEmailJob {
  token: string;
}

export type ImpersonationActionSummary = {
  label: string;
  status: string;
  createdAt?: string;
};

export interface IUserImpersonationStartedEmailJob extends IEmailJob {
  userName?: string;
  adminName?: string;
  reason?: string;
  startedAt: string;
  expiresAt?: string;
}

export interface IUserImpersonationEndedEmailJob extends IEmailJob {
  userName?: string;
  adminName?: string;
  startedAt?: string;
  endedAt: string;
  actions: ImpersonationActionSummary[];
}

export interface IAdminSendEmailJob {
  emailLogId: AutoIncrementID;
}
