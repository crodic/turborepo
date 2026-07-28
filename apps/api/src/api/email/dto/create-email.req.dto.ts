import {
  DateFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateEmailReqDto {
  @ApiProperty({ type: [String], example: ['user@example.com'] })
  @ValidateIf((o) => !o.sendToAllUsers && !o.sendToAllAdmins)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  to?: string[];

  @ApiPropertyOptional({ type: Boolean, example: false })
  @IsOptional()
  @IsBoolean()
  sendToAllUsers?: boolean;

  @ApiPropertyOptional({ type: Boolean, example: false })
  @IsOptional()
  @IsBoolean()
  sendToAllAdmins?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['cc@example.com'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String], example: ['bcc@example.com'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  bcc?: string[];

  @StringField({ maxLength: 255 })
  subject: string;

  @StringField()
  body: string;

  @DateFieldOptional()
  scheduledAt?: Date;

  @StringFieldOptional({ maxLength: 80 })
  templateName?: string;
}
