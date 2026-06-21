import { OmitType } from '@nestjs/swagger';
import { CreateAdminUserReqDto } from './create-admin-user.req.dto';

export class UpdateAdminUserReqDto extends OmitType(CreateAdminUserReqDto, [
  'password',
] as const) {}
