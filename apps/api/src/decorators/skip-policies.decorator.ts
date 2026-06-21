import { SKIP_POLICIES } from '@/constants/app.constant';
import { SetMetadata } from '@nestjs/common';

export const SkipPolicies = () => SetMetadata(SKIP_POLICIES, true);
