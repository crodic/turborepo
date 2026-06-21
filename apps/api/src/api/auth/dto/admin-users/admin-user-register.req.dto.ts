import { AutoIncrementID } from '@/common/types/common.type';
import {
  EmailField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AdminUserRegisterReqDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;

  @ApiProperty({
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds!: AutoIncrementID[];

  @StringFieldOptional()
  username?: string;

  @StringField()
  first_name!: string;

  @StringField()
  last_name!: string;
}
