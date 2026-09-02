import { DomainType } from '@/constants/entity.enum';
import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const DOMAIN_KEY = 'domain';
export const Domain = (domain: DomainType): CustomDecorator =>
  SetMetadata(DOMAIN_KEY, domain);
