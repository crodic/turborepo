import { AutoIncrementID } from '@/common/types/common.type';
import {
  DateFieldOptional,
  EmailField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Trim } from '@/decorators/transform.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateAdminUserReqDto {
  @StringField()
  @Trim()
  firstName: string;

  @StringField()
  @Trim()
  lastName: string;

  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @StringFieldOptional()
  bio?: string;

  @ApiProperty({
    type: [String],
    example: ['1', '2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds!: AutoIncrementID[];

  @StringFieldOptional()
  phone?: string;

  @DateFieldOptional()
  @Transform(({ value }) => (value ? new Date(value) : null))
  birthday?: Date;
}
