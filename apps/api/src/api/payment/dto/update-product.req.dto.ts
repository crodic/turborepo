import { PartialType } from '@nestjs/swagger';
import { CreateProductReqDto } from './create-product.req.dto';

export class UpdateProductReqDto extends PartialType(CreateProductReqDto) {}
