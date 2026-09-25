import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrderEntity } from '../entities/payment-order.entity';
import { PaymentProductEntity } from '../entities/payment-product.entity';
import { PolarService } from './polar.service';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let productRepoMock: Partial<
    Record<keyof Repository<PaymentProductEntity>, jest.Mock>
  >;
  let orderRepoMock: Partial<
    Record<keyof Repository<PaymentOrderEntity>, jest.Mock>
  >;
  let polarServiceMock: {
    isGatewayConfigured: jest.Mock;
    createPolarProduct: jest.Mock;
    updatePolarProduct: jest.Mock;
    updateProductBenefits: jest.Mock;
    archivePolarProduct: jest.Mock;
    deletePolarProduct: jest.Mock;
    listBenefits: jest.Mock;
  };

  beforeEach(async () => {
    productRepoMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: entity.id || 1 }),
        ),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    orderRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };

    polarServiceMock = {
      isGatewayConfigured: jest.fn().mockReturnValue(true),
      createPolarProduct: jest
        .fn()
        .mockResolvedValue({ id: 'polar_prod_123', metadata: {} }),
      updatePolarProduct: jest.fn().mockResolvedValue({ id: 'polar_prod_123' }),
      updateProductBenefits: jest
        .fn()
        .mockResolvedValue({ id: 'polar_prod_123' }),
      archivePolarProduct: jest
        .fn()
        .mockResolvedValue({ id: 'polar_prod_123', isArchived: true }),
      deletePolarProduct: jest.fn().mockResolvedValue({ id: 'polar_prod_123' }),
      listBenefits: jest
        .fn()
        .mockResolvedValue([{ id: 'ben_1', type: 'custom' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(PaymentProductEntity),
          useValue: productRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentOrderEntity),
          useValue: orderRepoMock,
        },
        {
          provide: PolarService,
          useValue: polarServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('should throw ConflictException if planSlug and interval conflict exists', async () => {
      productRepoMock.findOne!.mockResolvedValueOnce({
        id: 1,
      } as unknown as PaymentProductEntity);

      await expect(
        service.createProduct({
          planSlug: 'pro',
          name: 'Pro',
          interval: 'monthly',
          price: 20,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create product on Polar and save locally with polarProductId', async () => {
      productRepoMock.findOne!.mockResolvedValueOnce(null);

      const result = await service.createProduct({
        planSlug: 'pro',
        name: 'Pro Plan',
        interval: 'monthly',
        price: 20,
        currency: 'usd',
        benefits: ['ben_1'],
      });

      expect(polarServiceMock.createPolarProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pro Plan',
          interval: 'monthly',
          price: 20,
          currency: 'usd',
        }),
      );
      expect(polarServiceMock.updateProductBenefits).toHaveBeenCalledWith(
        'polar_prod_123',
        ['ben_1'],
      );
      expect(result.polarProductId).toBe('polar_prod_123');
    });
  });

  describe('updateProduct', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      productRepoMock.findOne!.mockResolvedValueOnce(null);

      await expect(
        service.updateProduct(99 as any, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update product on Polar and save changes locally', async () => {
      const existingProduct = {
        id: 1,
        planSlug: 'pro',
        name: 'Pro',
        interval: 'monthly',
        polarProductId: 'polar_prod_123',
        price: 20,
        currency: 'usd',
        metadata: {},
      } as unknown as PaymentProductEntity;

      productRepoMock.findOne!.mockResolvedValueOnce(existingProduct);

      const result = await service.updateProduct(1 as any, {
        name: 'Pro Updated',
        price: 25,
        benefits: ['ben_2'],
      });

      expect(polarServiceMock.updatePolarProduct).toHaveBeenCalledWith(
        'polar_prod_123',
        expect.objectContaining({
          name: 'Pro Updated',
          price: 25,
        }),
      );
      expect(polarServiceMock.updateProductBenefits).toHaveBeenCalledWith(
        'polar_prod_123',
        ['ben_2'],
      );
      expect(result.name).toBe('Pro Updated');
    });
  });

  describe('deleteProduct', () => {
    it('should archive product if it has existing orders', async () => {
      const product = {
        id: 1,
        planSlug: 'pro',
        interval: 'monthly',
        polarProductId: 'polar_prod_123',
        isActive: true,
      } as unknown as PaymentProductEntity;

      productRepoMock.findOne!.mockResolvedValueOnce(product);
      orderRepoMock.count!.mockResolvedValueOnce(3); // Has 3 orders

      const result = await service.deleteProduct(1 as any);

      expect(result).toEqual({ archived: true, deleted: false });
      expect(polarServiceMock.archivePolarProduct).toHaveBeenCalledWith(
        'polar_prod_123',
      );
      expect(product.isActive).toBe(false);
      expect(productRepoMock.save).toHaveBeenCalledWith(product);
      expect(productRepoMock.remove).not.toHaveBeenCalled();
    });

    it('should permanently delete product if it has no orders', async () => {
      const product = {
        id: 1,
        planSlug: 'starter',
        interval: 'monthly',
        polarProductId: 'polar_prod_456',
        isActive: true,
      } as unknown as PaymentProductEntity;

      productRepoMock.findOne!.mockResolvedValueOnce(product);
      orderRepoMock.count!.mockResolvedValueOnce(0); // 0 orders

      const result = await service.deleteProduct(1 as any);

      expect(result).toEqual({ archived: false, deleted: true });
      expect(polarServiceMock.deletePolarProduct).toHaveBeenCalledWith(
        'polar_prod_456',
      );
      expect(productRepoMock.remove).toHaveBeenCalledWith(product);
    });
  });

  describe('getPolarBenefits', () => {
    it('should return benefits list from Polar', async () => {
      const benefits = await service.getPolarBenefits();
      expect(polarServiceMock.listBenefits).toHaveBeenCalled();
      expect(benefits).toEqual([{ id: 'ben_1', type: 'custom' }]);
    });
  });
});
