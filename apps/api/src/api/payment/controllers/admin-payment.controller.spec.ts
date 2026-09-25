import { AutoIncrementID } from '@/common/types/common.type';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../services/payment.service';
import { ProductService } from '../services/product.service';
import { AdminPaymentController } from './admin-payment.controller';

describe('AdminPaymentController', () => {
  let controller: AdminPaymentController;
  let paymentServiceMock: Partial<Record<keyof PaymentService, jest.Mock>>;
  let productServiceMock: Partial<Record<keyof ProductService, jest.Mock>>;

  beforeEach(async () => {
    paymentServiceMock = {
      getAdminOrders: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getAdminTransactions: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getAdminSubscriptions: jest
        .fn()
        .mockResolvedValue({ data: [], meta: {} }),
      getUserPaymentSummary: jest
        .fn()
        .mockResolvedValue({ subscriptions: [], recentOrders: [] }),
      getAdminRefundRequests: jest
        .fn()
        .mockResolvedValue({ data: [], meta: {} }),
      reviewRefundRequest: jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'approved' }),
      directRefundOrder: jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'refunded' }),
    };

    productServiceMock = {
      getAdminProducts: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getAdminProductById: jest.fn().mockResolvedValue({ id: 1, name: 'Pro' }),
      syncAllProductsFromPolar: jest.fn().mockResolvedValue([]),
      createProduct: jest.fn().mockResolvedValue({ id: 1, name: 'Pro' }),
      updateProduct: jest.fn().mockResolvedValue({ id: 1, name: 'Pro Plus' }),
      deleteProduct: jest.fn().mockResolvedValue(undefined),
      getPolarBenefits: jest
        .fn()
        .mockResolvedValue([{ id: 'ben_1', type: 'custom' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentServiceMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AdminPaymentController>(AdminPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getAdminProducts', async () => {
    const query = { path: '' } as any;
    await controller.getProducts(query);
    expect(productServiceMock.getAdminProducts).toHaveBeenCalledWith(query);
  });

  it('should call getOrders', async () => {
    const query = { path: '' } as any;
    await controller.getOrders(query);
    expect(paymentServiceMock.getAdminOrders).toHaveBeenCalledWith(query);
  });

  it('should call reviewRefundRequest', async () => {
    const dto = { action: 'approve' } as any;
    await controller.reviewRefundRequest(
      '1' as AutoIncrementID,
      dto,
      '99' as AutoIncrementID,
    );
    expect(paymentServiceMock.reviewRefundRequest).toHaveBeenCalledWith(
      '99',
      '1',
      dto,
    );
  });

  it('should call directRefundOrder', async () => {
    const dto = { reason: 'Customer requested' } as any;
    await controller.directRefundOrder(
      '1' as AutoIncrementID,
      dto,
      '99' as AutoIncrementID,
    );
    expect(paymentServiceMock.directRefundOrder).toHaveBeenCalledWith(
      '99',
      '1',
      dto,
    );
  });

  it('should call getBenefits', async () => {
    const result = await controller.getBenefits();
    expect(productServiceMock.getPolarBenefits).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'ben_1', type: 'custom' }]);
  });
});
