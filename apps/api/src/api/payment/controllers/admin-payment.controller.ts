import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/shared/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { DirectRefundReqDto } from '../dto/direct-refund.req.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentRefundRequestResDto } from '../dto/payment-refund-request.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { ReviewRefundRequestReqDto } from '../dto/review-refund-request.req.dto';
import { PaymentService } from '../services/payment.service';
import { PolarService } from '../services/polar.service';

@ApiTags('Admin - Payments')
@Controller({
  path: 'admin/payments',
  version: '1',
})
@UseGuards(AdminAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class AdminPaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly polarService: PolarService,
  ) {}

  @Get('products')
  @ApiOperation({
    summary: 'Get all products from Polar (Admin)',
    description: 'Fetches active products directly from Polar API.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of products from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getProducts() {
    return await this.polarService.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Get product details from Polar (Admin)',
    description: 'Fetches product details by ID directly from Polar API.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getProduct(@Param('id') id: string) {
    return await this.polarService.getProduct(id);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Get all payment orders (Admin)',
    description: 'Retrieves a paginated list of all orders across the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of payment orders',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrders(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentOrderResDto>> {
    return (await this.paymentService.getAdminOrders(query)) as any;
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Get all subscriptions (Admin)',
    description: 'Retrieves a paginated list of all SaaS subscriptions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of subscriptions',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getSubscriptions(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentSubscriptionResDto>> {
    return (await this.paymentService.getAdminSubscriptions(query)) as any;
  }

  @Get('refund-requests')
  @ApiOperation({
    summary: 'Get all refund requests (Admin)',
    description:
      'Retrieves a paginated list of all refund requests across the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of refund requests',
    type: [PaymentRefundRequestResDto],
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getRefundRequests(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentRefundRequestResDto>> {
    return await this.paymentService.getAdminRefundRequests(query);
  }

  @Post('refund-requests/:id/review')
  @ApiOperation({
    summary: 'Review a refund request (Admin)',
    description:
      'Approves or rejects a customer refund request. If approved, calls Polar gateway to refund.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund request reviewed successfully',
    type: PaymentRefundRequestResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async reviewRefundRequest(
    @Param('id') id: AutoIncrementID,
    @Body() dto: ReviewRefundRequestReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<PaymentRefundRequestResDto> {
    return await this.paymentService.reviewRefundRequest(adminId, id, dto);
  }

  @Post('orders/:id/direct-refund')
  @ApiOperation({
    summary: 'Directly refund an order (Admin)',
    description: 'Initiates a direct refund via Polar for a paid order.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order refunded successfully',
    type: PaymentOrderResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async directRefund(
    @Param('id') orderId: AutoIncrementID,
    @Body() dto: DirectRefundReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<PaymentOrderResDto> {
    return await this.paymentService.directRefundOrder(adminId, orderId, dto);
  }
}
