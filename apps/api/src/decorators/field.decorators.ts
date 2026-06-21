import { Constructor } from '@/common/types/types';
import {
  ALL_PERMISSIONS,
  AppActions,
  AppSubjects,
} from '@/utils/permissions.constant';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsJWT,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { ToBoolean, ToLowerCase, ToUpperCase } from './transform.decorators';
import { IsNullable } from './validators/is-nullable.decorator';
import { IsPassword } from './validators/is-password.decorator';
import { IsPermissionsArray } from './validators/is-permission-array.decorator';

interface IFieldOptions {
  each?: boolean;
  swagger?: boolean;
  nullable?: boolean;
  groups?: string[];
}

interface INumberFieldOptions extends IFieldOptions {
  min?: number;
  max?: number;
  int?: boolean;
  isPositive?: boolean;
}

interface IStringFieldOptions extends IFieldOptions {
  minLength?: number;
  maxLength?: number;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
}

interface IEnumFieldOptions extends IFieldOptions {
  enumName?: string;
}

interface IJsonFieldOptions extends IFieldOptions {
  valueType?: string;
}

export interface IArrayFieldOptions {
  required?: boolean;
  nullable?: boolean;
  minSize?: number;
  maxSize?: number;
  notEmpty?: boolean;
  swagger?: boolean;
}

type IBooleanFieldOptions = IFieldOptions;
type ITokenFieldOptions = IFieldOptions;
type IClassFieldOptions = IFieldOptions;

export function NumberField(
  options: Omit<ApiPropertyOptions, 'type'> & INumberFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => Number)];

  if (options.nullable) {
    decorators.push(IsNullable({ each: options.each }));
  } else {
    decorators.push(NotEquals(null, { each: options.each }));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({ type: Number, required: !!required, ...restOptions }),
    );
  }

  if (options.int) {
    decorators.push(IsInt({ each: options.each }));
  } else {
    decorators.push(IsNumber({}, { each: options.each }));
  }

  if (typeof options.min === 'number') {
    decorators.push(Min(options.min, { each: options.each }));
  }

  if (typeof options.max === 'number') {
    decorators.push(Max(options.max, { each: options.each }));
  }

  if (options.isPositive) {
    decorators.push(IsPositive({ each: options.each }));
  }

  return applyDecorators(...decorators);
}

export function NumberFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    INumberFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    NumberField({ required: false, ...options }),
  );
}

export function StringField(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => String), IsString({ each: options.each })];

  if (options.nullable) {
    decorators.push(IsNullable({ each: options.each }));
  } else {
    decorators.push(NotEquals(null, { each: options.each }));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: String,
        required: !!required,
        ...restOptions,
        isArray: options.each,
      }),
    );
  }

  const minLength = options.minLength ?? 1;

  decorators.push(MinLength(minLength, { each: options.each }));

  if (options.maxLength) {
    decorators.push(MaxLength(options.maxLength, { each: options.each }));
  }

  if (options.toLowerCase) {
    decorators.push(ToLowerCase());
  }

  if (options.toUpperCase) {
    decorators.push(ToUpperCase());
  }

  return applyDecorators(...decorators);
}

export function TokenField(
  options: Omit<ApiPropertyOptions, 'type'> & ITokenFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => String), IsJWT({ each: options.each })];

  if (options.nullable) {
    decorators.push(IsNullable({ each: options.each }));
  } else {
    decorators.push(NotEquals(null, { each: options.each }));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: String,
        required: !!required,
        ...restOptions,
        isArray: options.each,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function TokenFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    ITokenFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    TokenField({ required: false, ...options }),
  );
}

export function StringFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    IStringFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    StringField({ required: false, ...options }),
  );
}

export function PasswordField(
  options: Omit<ApiPropertyOptions, 'type' | 'minLength'> &
    IStringFieldOptions = {},
): PropertyDecorator {
  const decorators = [StringField({ ...options, minLength: 6 }), IsPassword()];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  return applyDecorators(...decorators);
}

export function PasswordFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required' | 'minLength'> &
    IStringFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    PasswordField({ required: false, ...options }),
  );
}

export function BooleanField(
  options: Omit<ApiPropertyOptions, 'type'> & IBooleanFieldOptions = {},
): PropertyDecorator {
  const decorators = [ToBoolean(), IsBoolean()];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({ type: Boolean, required: !!required, ...restOptions }),
    );
  }

  return applyDecorators(...decorators);
}

export function BooleanFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    IBooleanFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    BooleanField({ required: false, ...options }),
  );
}

export function EmailField(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  const decorators = [
    IsEmail(),
    StringField({ toLowerCase: true, ...options }),
  ];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({ type: String, required: !!required, ...restOptions }),
    );
  }

  return applyDecorators(...decorators);
}

export function EmailFieldOptional(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    EmailField({ required: false, ...options }),
  );
}

export function UUIDField(
  options: Omit<ApiPropertyOptions, 'type' | 'format' | 'isArray'> &
    IFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => String), IsUUID('4', { each: options.each })];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: options.each ? [String] : String,
        format: 'uuid',
        isArray: options.each,
        required: !!required,
        ...restOptions,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function UUIDFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required' | 'isArray'> &
    IFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    UUIDField({ required: false, ...options }),
  );
}

export function URLField(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  const decorators = [StringField(options), IsUrl({}, { each: true })];

  if (options.nullable) {
    decorators.push(IsNullable({ each: options.each }));
  } else {
    decorators.push(NotEquals(null, { each: options.each }));
  }

  return applyDecorators(...decorators);
}

export function URLFieldOptional(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    URLField({ required: false, ...options }),
  );
}

export function DateField(
  options: Omit<ApiPropertyOptions, 'type'> & IFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => Date), IsDate()];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({ type: Date, required: !!required, ...restOptions }),
    );
  }

  return applyDecorators(...decorators);
}

export function DateFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> & IFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    DateField({ ...options, required: false }),
  );
}

export function EnumField<TEnum extends object>(
  getEnum: () => TEnum,
  options: Omit<ApiPropertyOptions, 'type' | 'enum' | 'isArray'> &
    IEnumFieldOptions = {},
): PropertyDecorator {
  const decorators = [IsEnum(getEnum(), { each: options.each })];

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        enum: getEnum(),
        enumName: options.enumName || getVariableName(getEnum),
        isArray: options.each,
        required: !!required,
        ...restOptions,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function EnumFieldOptional<TEnum extends object>(
  getEnum: () => TEnum,
  options: Omit<ApiPropertyOptions, 'type' | 'required' | 'enum'> &
    IEnumFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    EnumField(getEnum, { required: false, ...options }),
  );
}

export function ClassField<TClass extends Constructor>(
  getClass: () => TClass,
  options: Omit<ApiPropertyOptions, 'type'> & IClassFieldOptions = {},
): PropertyDecorator {
  const decorators = [
    Type(() => getClass()),
    ValidateNested({ each: options.each }),
  ];

  if (options.required !== false) {
    decorators.push(IsDefined());
  }

  if (options.nullable) {
    decorators.push(IsNullable());
  } else {
    decorators.push(NotEquals(null));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: () => getClass(),
        required: !!required,
        ...restOptions,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ClassFieldOptional<TClass extends Constructor>(
  getClass: () => TClass,
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    IClassFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    ClassField(getClass, { required: false, ...options }),
  );
}

export function JsonField(
  options: Omit<ApiPropertyOptions, 'type'> & IJsonFieldOptions = {},
): PropertyDecorator {
  const decorators = [Type(() => Object), IsObject({ each: options.each })];

  if (options.nullable) {
    decorators.push(IsNullable({ each: options.each }));
  } else {
    decorators.push(NotEquals(null, { each: options.each }));
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: Object,
        required: !!required,
        ...restOptions,
        isArray: options.each,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function JsonFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> &
    IJsonFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options.each }),
    JsonField({ required: false, ...options }),
  );
}

function getVariableName(variableFunction: () => any) {
  return variableFunction.toString().split('.').pop();
}

export function PermissionsArrayField(
  options: Omit<ApiPropertyOptions, 'type' | 'enum'> & IEnumFieldOptions = {},
): PropertyDecorator {
  const decorators = [
    IsPermissionsArray({ message: 'Invalid permissions array' }),
  ];

  if (options.nullable) {
    decorators.push(IsNullable());
  }
  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: [String],
        enumName: restOptions.enumName || 'PermissionEnum',
        enum: ALL_PERMISSIONS.filter(
          (e) => e.name !== `${AppActions.Manage}:${AppSubjects.All}`,
        ).map((p) => p.name),
        isArray: true,
        required: !!required,
        ...restOptions,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function PermissionsArrayFieldOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'enum' | 'required'> &
    IEnumFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    PermissionsArrayField({ required: false, ...options }),
  );
}

export function ArrayField(
  itemType: any,
  options: Omit<ApiPropertyOptions, 'type' | 'isArray'> &
    IArrayFieldOptions = {},
): PropertyDecorator {
  const decorators = [
    IsArray(),
    Type(() => itemType),
    ValidateNested({ each: true }),
  ];

  if (options.notEmpty) {
    decorators.push(ArrayNotEmpty());
  }

  if (typeof options.minSize === 'number') {
    decorators.push(ArrayMinSize(options.minSize));
  }

  if (typeof options.maxSize === 'number') {
    decorators.push(ArrayMaxSize(options.maxSize));
  }

  if (options.nullable) {
    decorators.push(IsOptional());
  }

  if (options.swagger !== false) {
    const { required = true, ...restOptions } = options;
    decorators.push(
      ApiProperty({
        type: itemType,
        isArray: true,
        required: !!required,
        ...restOptions,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ArrayFieldOptional(
  itemType: any,
  options: Omit<ApiPropertyOptions, 'type' | 'isArray' | 'required'> &
    IArrayFieldOptions = {},
): PropertyDecorator {
  return applyDecorators(
    IsOptional({ each: options['each'] }),
    ArrayField(itemType, { required: false, ...options }),
  );
}

export interface DeepObjectFieldOptions {
  each?: boolean;
}

export function DeepObjectField(
  dto: new () => any,
  options: DeepObjectFieldOptions = {},
): PropertyDecorator {
  const { each = false } = options;

  return applyDecorators(
    Type(() => dto),
    ValidateNested({ each }),
  );
}
