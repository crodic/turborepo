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

export interface IFileUploadJob {
  filePath: string;
  originalName: string;
  mimetype: string;
  size: number;
  userId?: AutoIncrementID;
  destinationPath: string;
  callbackEventName?: string;
  metadata?: Record<string, any>;
}

export interface IAdminAccountDeletionRequestedEmailJob extends IEmailJob {
  adminName: string;
  deletionDate: string;
}

export interface IAdminAccountHardDeletedEmailJob extends IEmailJob {
  adminName: string;
  deletedAt: string;
}

export interface IAdminAccountHardDeletedReportEmailJob extends IEmailJob {
  adminName: string;
  deletedCount: number;
}
