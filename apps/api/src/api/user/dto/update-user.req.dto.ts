import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/swagger';
import { CreateUserReqDto } from './create-user.req.dto';

export class UpdateUserReqDto extends PartialType(
  OmitType(CreateUserReqDto, ['email', 'password', 'confirmPassword'] as const),
) {}
