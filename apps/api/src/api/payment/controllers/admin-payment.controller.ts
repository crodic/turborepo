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
  Query,
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
import { PaymentWebhookEventResDto } from '../dto/payment-webhook-event.res.dto';
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
    description:
      'Fetches active products directly from Polar API with Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of products from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getProducts(
    @Query('query') query?: string,
    @Query('isRecurring') isRecurring?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.listProducts(
      {
        query,
        isRecurring:
          isRecurring !== undefined ? isRecurring === 'true' : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      },
      true,
      refresh === 'true',
    );
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Get product details from Polar (Admin)',
    description:
      'Fetches product details by ID directly from Polar API with Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getProduct(
    @Param('id') id: string,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.getProduct(id, true, refresh === 'true');
  }

  @Get('discounts')
  @ApiOperation({
    summary: 'Get all discounts from Polar (Admin)',
    description:
      'Fetches discounts directly from Polar API with pagination and Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated discounts from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getDiscounts(
    @Query('query') query?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.listDiscounts(
      {
        query,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      },
      true,
      refresh === 'true',
    );
  }

  @Get('discounts/:id')
  @ApiOperation({
    summary: 'Get discount details from Polar (Admin)',
    description:
      'Fetches discount details by ID directly from Polar API with Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discount details from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getDiscount(
    @Param('id') id: string,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.getDiscount(id, true, refresh === 'true');
  }

  @Get('checkout-links')
  @ApiOperation({
    summary: 'Get all checkout links from Polar (Admin)',
    description:
      'Fetches checkout links directly from Polar API with pagination and Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated checkout links from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getCheckoutLinks(
    @Query('productId') productId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.listCheckoutLinks(
      {
        productId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      },
      true,
      refresh === 'true',
    );
  }

  @Get('checkout-links/:id')
  @ApiOperation({
    summary: 'Get checkout link details from Polar (Admin)',
    description:
      'Fetches checkout link details by ID directly from Polar API with Redis cache.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checkout link details from Polar',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getCheckoutLink(
    @Param('id') id: string,
    @Query('refresh') refresh?: string,
  ) {
    return await this.polarService.getCheckoutLink(
      id,
      true,
      refresh === 'true',
    );
  }

  @Post('cache/refresh')
  @ApiOperation({
    summary: 'Clear / refresh Polar Redis cache (Admin)',
    description: 'Purges cached Polar catalog items from Redis.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache cleared successfully',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async refreshCache(@Query('scope') scope?: string) {
    await this.polarService.clearCache(scope);
    return {
      success: true,
      message: `Polar cache for scope '${scope || 'all'}' cleared successfully.`,
    };
  }

  @Get('webhook-events')
  @ApiOperation({
    summary: 'Get all tracked webhook events (Admin)',
    description:
      'Retrieves a paginated list of all received Polar webhook events.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of webhook events',
    type: [PaymentWebhookEventResDto],
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getWebhookEvents(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentWebhookEventResDto>> {
    return (await this.paymentService.getAdminWebhookEvents(query)) as any;
  }

  @Get('webhook-events/:id')
  @ApiOperation({
    summary: 'Get webhook event details (Admin)',
    description:
      'Retrieves details and raw payload of a specific tracked webhook event by DB ID or Polar eventId.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed webhook event with payload',
    type: PaymentWebhookEventResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getWebhookEvent(
    @Param('id') id: string,
  ): Promise<PaymentWebhookEventResDto> {
    return (await this.paymentService.getAdminWebhookEvent(id)) as any;
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

  @Get('users/:userId/summary')
  @ApiOperation({
    summary: 'Get user payment summary (Admin)',
    description:
      'Retrieves subscriptions, orders, and payment summary for a specific user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payment summary',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getUserPaymentSummary(@Param('userId') userId: AutoIncrementID) {
    return await this.paymentService.getUserPaymentSummary(userId);
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
