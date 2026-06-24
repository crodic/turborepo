import { EThemeStatus } from '@/constants/entity.enum';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isThemeStyles } from './theme-style.dto';

@ValidatorConstraint({ name: 'isThemeStyles', async: false })
export class IsThemeStylesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isThemeStyles(value);
  }

  defaultMessage() {
    return 'styles must contain valid light and dark theme tokens';
  }
}

export class CreateThemeReqDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string | null;

  @IsObject()
  @Validate(IsThemeStylesConstraint)
  styles: unknown;

  @IsEnum(EThemeStatus)
  @IsOptional()
  status?: EThemeStatus;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isAdminDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isClientDefault?: boolean;
}
