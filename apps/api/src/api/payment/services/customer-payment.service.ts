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
import { UserEntity } from '../../user/entities/user.entity';
import { CreateCustomerReqDto } from '../dto/create-customer.req.dto';
import { PaymentCustomerResDto } from '../dto/payment-customer.res.dto';
import { UpdateCustomerReqDto } from '../dto/update-customer.req.dto';
import { PolarCustomerEntity } from '../entities/polar-customer.entity';
import { PolarService } from './polar.service';

@Injectable()
export class CustomerPaymentService {
  private readonly logger = new Logger(CustomerPaymentService.name);

  constructor(
    @InjectRepository(PolarCustomerEntity)
    private readonly customerRepo: Repository<PolarCustomerEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly polarService: PolarService,
  ) {}

  async getAdminCustomers(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentCustomerResDto>> {
    const queryBuilder = this.customerRepo
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
      searchableColumns: ['email', 'name', 'polarCustomerId'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        email: [FilterOperator.ILIKE, FilterOperator.EQ],
        name: [FilterOperator.ILIKE],
        userId: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentCustomerResDto, result.data),
    } as Paginated<PaymentCustomerResDto>;
  }

  async getCustomerById(id: AutoIncrementID): Promise<PaymentCustomerResDto> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID #${id} not found.`);
    }
    return plainToInstance(PaymentCustomerResDto, customer);
  }

  async createCustomer(
    dto: CreateCustomerReqDto,
  ): Promise<PaymentCustomerResDto> {
    const existing = await this.customerRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Customer with email "${dto.email}" already exists.`,
      );
    }

    let polarCustomer: any = null;
    if (this.polarService.isGatewayConfigured()) {
      polarCustomer = await this.polarService.createCustomer({
        email: dto.email.toLowerCase(),
        name: dto.name || undefined,
        billingAddress: dto.billingAddress || undefined,
        taxId: dto.taxId || undefined,
        metadata: dto.metadata || undefined,
      });
    }

    const matchedUser = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    const newCustomer = this.customerRepo.create({
      userId: matchedUser?.id ?? null,
      polarCustomerId: polarCustomer?.id || `local_cus_${Date.now()}`,
      email: dto.email.toLowerCase(),
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      billingAddress: dto.billingAddress || null,
      taxId: dto.taxId || null,
      metadata: dto.metadata || {},
    });

    const saved = await this.customerRepo.save(newCustomer);
    return plainToInstance(PaymentCustomerResDto, saved);
  }

  async updateCustomer(
    id: AutoIncrementID,
    dto: UpdateCustomerReqDto,
  ): Promise<PaymentCustomerResDto> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      customer.polarCustomerId &&
      !customer.polarCustomerId.startsWith('local_')
    ) {
      const payload: any = {};
      if (dto.name !== undefined) payload.name = dto.name;
      if (dto.billingAddress !== undefined)
        payload.billingAddress = dto.billingAddress;
      if (dto.taxId !== undefined) payload.taxId = dto.taxId;
      if (dto.metadata !== undefined) payload.metadata = dto.metadata;

      await this.polarService.updateCustomer(customer.polarCustomerId, payload);
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.avatarUrl !== undefined) customer.avatarUrl = dto.avatarUrl;
    if (dto.billingAddress !== undefined)
      customer.billingAddress = dto.billingAddress;
    if (dto.taxId !== undefined) customer.taxId = dto.taxId;
    if (dto.metadata !== undefined) customer.metadata = dto.metadata;

    const saved = await this.customerRepo.save(customer);
    return plainToInstance(PaymentCustomerResDto, saved);
  }

  async deleteCustomer(
    id: AutoIncrementID,
    anonymize?: boolean,
  ): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      customer.polarCustomerId &&
      !customer.polarCustomerId.startsWith('local_')
    ) {
      try {
        await this.polarService.deleteCustomer(
          customer.polarCustomerId,
          anonymize,
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to delete Polar customer ${customer.polarCustomerId}: ${err.message}`,
        );
      }
    }

    await this.customerRepo.remove(customer);
  }

  async getCustomerState(id: AutoIncrementID): Promise<any> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID #${id} not found.`);
    }

    if (
      !this.polarService.isGatewayConfigured() ||
      !customer.polarCustomerId ||
      customer.polarCustomerId.startsWith('local_')
    ) {
      return {
        customerId: customer.id,
        polarCustomerId: customer.polarCustomerId,
        activeSubscriptions: [],
        activeBenefits: [],
      };
    }

    return await this.polarService.getCustomerState(customer.polarCustomerId);
  }

  async getCustomerPaymentMethods(id: AutoIncrementID): Promise<any> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID #${id} not found.`);
    }

    if (
      !this.polarService.isGatewayConfigured() ||
      !customer.polarCustomerId ||
      customer.polarCustomerId.startsWith('local_')
    ) {
      return { items: [], pagination: { totalCount: 0 } };
    }

    return await this.polarService.listCustomerPaymentMethods(
      customer.polarCustomerId,
    );
  }

  async exportCustomers(): Promise<string> {
    if (!this.polarService.isGatewayConfigured()) {
      return 'id,email,name,created_at\n';
    }
    return await this.polarService.exportCustomers();
  }

  async syncCustomers(): Promise<{ synced: number }> {
    if (!this.polarService.isGatewayConfigured()) {
      return { synced: 0 };
    }

    this.logger.log('Syncing customers from Polar...');
    const result = await this.polarService.listCustomers({ limit: 100 });
    const items =
      (result as any)?.items ?? (result as any)?.result?.items ?? [];

    let count = 0;
    for (const item of items) {
      let local = await this.customerRepo.findOne({
        where: { polarCustomerId: item.id },
      });

      const matchedUser = await this.userRepo.findOne({
        where: { email: item.email?.toLowerCase() },
      });

      if (!local) {
        local = this.customerRepo.create({
          userId: matchedUser?.id ?? null,
          polarCustomerId: item.id,
          email: item.email?.toLowerCase(),
          name: item.name ?? null,
          avatarUrl: item.avatarUrl ?? null,
          billingAddress: item.billingAddress ?? null,
          taxId: item.taxId ?? null,
          metadata: item.metadata ?? {},
        });
      } else {
        if (!local.userId && matchedUser) {
          local.userId = matchedUser.id;
        }
        local.name = item.name ?? local.name;
        local.avatarUrl = item.avatarUrl ?? local.avatarUrl;
        local.billingAddress = item.billingAddress ?? local.billingAddress;
        local.taxId = item.taxId ?? local.taxId;
        local.metadata = item.metadata ?? local.metadata;
      }

      await this.customerRepo.save(local);
      count++;
    }

    this.logger.log(`Synced ${count} customers from Polar.`);
    return { synced: count };
  }
}
