import { ErrorDto } from '@/common/dto/error.dto';
import { HttpCode, HttpStatus, Type, applyDecorators } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { STATUS_CODES } from 'http';
import { PaginateConfig, PaginatedSwaggerDocs } from 'nestjs-paginate';
import { AuthOptional } from './auth-optional.decorator';
import { Public } from './public.decorator';

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}

type ApiResponseType = number;
type ApiAuthType = 'basic' | 'api-key' | 'jwt';

interface IApiBaseOptions<T extends Type<any>> {
  type?: T;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  operationId?: string;
  externalDocs?: ExternalDocumentationObject;
  errorResponses?: ApiResponseType[];
  statusCode?: HttpStatus;
}

type IApiPaginatedOptions<T extends Type<any>> = IApiBaseOptions<T> & {
  isPaginated: true;
  paginateOptions?: PaginateConfig<InstanceType<T>>;
};

type IApiNonPaginatedOptions<T extends Type<any>> = IApiBaseOptions<T> & {
  isPaginated?: false;
  paginateOptions?: never;
};

export type IApiOptions<T extends Type<any> = any> =
  | IApiPaginatedOptions<T>
  | IApiNonPaginatedOptions<T>;

export type IApiAuthOptions<T extends Type<any> = any> = IApiOptions<T> & {
  auths?: ApiAuthType[];
};

/* ---------------------------------------------------
   COMMON ERROR RESPONSE BUILDER
--------------------------------------------------- */
function buildErrorResponses(errorList: number[]) {
  return errorList.map((statusCode) =>
    ApiResponse({
      status: statusCode,
      type: ErrorDto,
      description: STATUS_CODES[statusCode],
    }),
  );
}

/* ---------------------------------------------------
   COMMON SUCCESS RESPONSE BUILDER
--------------------------------------------------- */
function buildSuccessDecorator<T extends Type<any>>(opts: IApiOptions<T>) {
  const status = opts.statusCode ?? HttpStatus.OK;
  const desc = opts.description ?? (status === 201 ? 'Created' : 'OK');

  if (opts.isPaginated) {
    return PaginatedSwaggerDocs(opts.type, opts.paginateOptions);
  }

  return status === HttpStatus.CREATED
    ? ApiCreatedResponse({ type: opts.type, description: desc })
    : ApiOkResponse({ type: opts.type, description: desc });
}

/* ---------------------------------------------------
   PUBLIC DECORATOR (NO AUTH)
--------------------------------------------------- */
export const ApiPublic = <T extends Type<any>>(
  options: IApiOptions<T> = {},
): MethodDecorator => {
  const defaultErrorResponses = [
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ];

  return applyDecorators(
    Public(),
    ApiOperation({
      summary: options.summary,
      description: options.description,
      deprecated: options.deprecated ?? false,
      operationId: options.operationId,
      externalDocs: options.externalDocs,
    }),
    HttpCode(options.statusCode ?? HttpStatus.OK),
    buildSuccessDecorator(options),
    ...buildErrorResponses(options.errorResponses || defaultErrorResponses),
  );
};

/* ---------------------------------------------------
   AUTH DECORATOR (JWT / BASIC / API-KEY)
--------------------------------------------------- */
export const ApiAuth = <T extends Type<any>>(
  options: IApiAuthOptions<T> = {},
): MethodDecorator => {
  const defaultErrorResponses = [
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ];

  const auths = options.auths || ['jwt'];

  const authDecorators = auths.map((auth) => {
    switch (auth) {
      case 'basic':
        return ApiBasicAuth();
      case 'api-key':
        return ApiSecurity('Api-Key');
      case 'jwt':
        return ApiBearerAuth();
    }
  });

  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
      deprecated: options.deprecated ?? false,
      operationId: options.operationId,
      externalDocs: options.externalDocs,
    }),
    HttpCode(options.statusCode ?? HttpStatus.OK),
    buildSuccessDecorator(options),
    ...authDecorators,
    ...buildErrorResponses(options.errorResponses || defaultErrorResponses),
  );
};

/* ---------------------------------------------------
   AUTH OPTIONAL DECORATOR (JWT / BASIC / API-KEY)
--------------------------------------------------- */
export const ApiAuthOptional = <T extends Type<any>>(
  options: IApiAuthOptions<T> = {},
): MethodDecorator => {
  const defaultErrorResponses = [
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.INTERNAL_SERVER_ERROR,
  ];

  const auths = options.auths || ['jwt'];

  const authDecorators = auths.map((auth) => {
    switch (auth) {
      case 'basic':
        return ApiBasicAuth();
      case 'api-key':
        return ApiSecurity('Api-Key');
      case 'jwt':
        return ApiBearerAuth();
    }
  });

  return applyDecorators(
    AuthOptional(),
    ApiOperation({
      summary: options.summary,
      description: options.description,
      deprecated: options.deprecated ?? false,
      operationId: options.operationId,
      externalDocs: options.externalDocs,
    }),
    HttpCode(options.statusCode ?? HttpStatus.OK),
    buildSuccessDecorator(options),
    ...authDecorators,
    ...buildErrorResponses(options.errorResponses || defaultErrorResponses),
  );
};
