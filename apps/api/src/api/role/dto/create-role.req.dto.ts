import { DomainType } from '@/constants/entity.enum';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateRoleReqDto {
  @StringField({ example: 'STAFF' })
  name: string;

  @EnumFieldOptional(() => DomainType, {
    default: DomainType.ADMIN,
    example: DomainType.ADMIN,
  })
  domain?: DomainType = DomainType.ADMIN;

  @StringFieldOptional({ minLength: 0 })
  description?: string;

  @BooleanFieldOptional()
  isSystem?: boolean;

  @ApiProperty({
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionIds: string[];
}
