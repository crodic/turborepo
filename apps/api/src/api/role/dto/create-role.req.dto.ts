import {
  BooleanFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateRoleReqDto {
  @StringField({ example: 'STAFF' })
  name: string;

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
