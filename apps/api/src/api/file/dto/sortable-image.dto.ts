import { ApiProperty } from '@nestjs/swagger';

export class SortableImageResDto {
  @ApiProperty({ example: 'img_lx8q9s6r_7f3a2b1c' })
  id!: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  src!: string;

  @ApiProperty({ example: 'product-front.png' })
  alt!: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class SortableImageListResDto {
  @ApiProperty({ example: 'demo-user' })
  ownerKey!: string;

  @ApiProperty({ example: 0, nullable: true })
  coverIndex!: number | null;

  @ApiProperty({ type: SortableImageResDto, isArray: true })
  images!: SortableImageResDto[];
}
