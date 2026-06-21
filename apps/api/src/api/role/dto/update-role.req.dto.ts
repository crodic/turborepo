import { PartialType } from '@nestjs/swagger';
import { CreateRoleReqDto } from './create-role.req.dto';

export class UpdateRoleReqDto extends PartialType(CreateRoleReqDto) {}
