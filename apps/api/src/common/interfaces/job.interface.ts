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

export interface IAdminSendEmailJob {
  emailLogId: AutoIncrementID;
}
