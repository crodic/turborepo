import { AutoIncrementID } from '@/common/types/common.type';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateProductReqDto } from '../dto/create-product.req.dto';
import { PaymentProductResDto } from '../dto/payment-product.res.dto';
import { UpdateProductReqDto } from '../dto/update-product.req.dto';
import { PaymentProductEntity } from '../entities/payment-product.entity';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(PaymentProductEntity)
    private readonly productRepo: Repository<PaymentProductEntity>,
  ) {}

  /**
   * Retrieves all active pricing products for public client display
   */
  async getActiveProducts(): Promise<PaymentProductResDto[]> {
    const products = await this.productRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return plainToInstance(PaymentProductResDto, products);
  }

  /**
   * Finds an active product by plan slug and interval, or throws NotFoundException
   */
  async getProductBySlugAndInterval(
    planSlug: string,
    interval: string,
  ): Promise<PaymentProductEntity> {
    const product = await this.productRepo.findOne({
      where: { planSlug, interval, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Pricing plan "${planSlug}" with interval "${interval}" was not found or is currently inactive.`,
      );
    }

    return product;
  }

  /**
   * Retrieves paginated list of all products for admin management
   */
  async getAdminProducts(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentProductResDto>> {
    const queryBuilder = this.productRepo.createQueryBuilder('product');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'planSlug',
        'name',
        'interval',
        'price',
        'sortOrder',
        'isActive',
        'createdAt',
      ],
      searchableColumns: ['planSlug', 'name', 'polarProductId'],
      defaultSortBy: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
      filterableColumns: {
        planSlug: [FilterOperator.EQ, FilterOperator.IN],
        interval: [FilterOperator.EQ, FilterOperator.IN],
        isActive: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentProductResDto, result.data),
    } as Paginated<PaymentProductResDto>;
  }

  /**
   * Retrieves a single product by ID for admin view/edit
   */
  async getAdminProductById(
    id: AutoIncrementID,
  ): Promise<PaymentProductResDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }
    return plainToInstance(PaymentProductResDto, product);
  }

  /**
   * Creates a new pricing product in the database
   */
  async createProduct(dto: CreateProductReqDto): Promise<PaymentProductResDto> {
    const existing = await this.productRepo.findOne({
      where: { planSlug: dto.planSlug, interval: dto.interval },
    });

    if (existing) {
      throw new ConflictException(
        `A product with planSlug "${dto.planSlug}" and interval "${dto.interval}" already exists.`,
      );
    }

    const product = this.productRepo.create({
      ...dto,
      currency: dto.currency || 'usd',
      polarProductId: dto.polarProductId || '',
      features: dto.features || [],
      ctaText: dto.ctaText || 'Get Started',
      isPopular: dto.isPopular ?? false,
      isFree: dto.isFree ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await this.productRepo.save(product);
    this.logger.log(
      `Product created: ${saved.planSlug} (${saved.interval}) - Polar ID: ${saved.polarProductId}`,
    );

    return plainToInstance(PaymentProductResDto, saved);
  }

  /**
   * Updates an existing pricing product
   */
  async updateProduct(
    id: AutoIncrementID,
    dto: UpdateProductReqDto,
  ): Promise<PaymentProductResDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }

    // Check conflict if changing planSlug or interval
    const targetSlug = dto.planSlug || product.planSlug;
    const targetInterval = dto.interval || product.interval;

    if (
      targetSlug !== product.planSlug ||
      targetInterval !== product.interval
    ) {
      const existing = await this.productRepo.findOne({
        where: { planSlug: targetSlug, interval: targetInterval },
      });
      if (existing && existing.id !== product.id) {
        throw new ConflictException(
          `Another product already has planSlug "${targetSlug}" and interval "${targetInterval}".`,
        );
      }
    }

    Object.assign(product, dto);
    const updated = await this.productRepo.save(product);
    this.logger.log(
      `Product #${id} updated: ${updated.planSlug} (${updated.interval}) - Polar ID: ${updated.polarProductId}`,
    );

    return plainToInstance(PaymentProductResDto, updated);
  }

  /**
   * Deletes a pricing product
   */
  async deleteProduct(id: AutoIncrementID): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }

    await this.productRepo.remove(product);
    this.logger.log(
      `Product #${id} (${product.planSlug} ${product.interval}) deleted.`,
    );
  }
}
