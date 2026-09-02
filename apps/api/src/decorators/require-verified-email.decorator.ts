import { REQUIRE_VERIFIED_EMAIL } from '@/constants/app.constant';
import { SetMetadata } from '@nestjs/common';

export const RequireVerifiedEmail = () =>
  SetMetadata(REQUIRE_VERIFIED_EMAIL, true);
