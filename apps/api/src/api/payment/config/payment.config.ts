import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import { PaymentConfig } from './payment-config.type';

enum PolarServerEnvironment {
  PRODUCTION = 'production',
  SANDBOX = 'sandbox',
}

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  POLAR_ACCESS_TOKEN?: string;

  @IsString()
  @IsOptional()
  POLAR_WEBHOOK_SECRET?: string;

  @IsEnum(PolarServerEnvironment)
  @IsOptional()
  POLAR_SERVER?: PolarServerEnvironment;

  @IsString()
  @IsOptional()
  POLAR_ORGANIZATION_ID?: string;
}

export default registerAs<PaymentConfig>('payment', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const server =
    (process.env.POLAR_SERVER as 'production' | 'sandbox') ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox');

  return {
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    server,
    organizationId: process.env.POLAR_ORGANIZATION_ID,
  };
});
