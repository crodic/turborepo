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
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CreateBenefitReqDto } from '../dto/create-benefit.req.dto';
import { CreateProductReqDto } from '../dto/create-product.req.dto';
import { DirectRefundReqDto } from '../dto/direct-refund.req.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentProductResDto } from '../dto/payment-product.res.dto';
import { PaymentRefundRequestResDto } from '../dto/payment-refund-request.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PaymentTransactionResDto } from '../dto/payment-transaction.res.dto';
import { ReviewRefundRequestReqDto } from '../dto/review-refund-request.req.dto';
import { UpdateProductReqDto } from '../dto/update-product.req.dto';
import { UserPaymentSummaryResDto } from '../dto/user-payment-summary.res.dto';
import { PaymentService } from '../services/payment.service';
import { ProductService } from '../services/product.service';

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
    private readonly productService: ProductService,
  ) {}

  // ---------------------------------------------------------------------------
  // Pricing Products Management (Admin)
  // ---------------------------------------------------------------------------

  @Get('products')
  @ApiOperation({
    summary: 'Get all payment products (Admin)',
    description: 'Retrieves a paginated list of pricing products and plans.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of payment products',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getProducts(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentProductResDto>> {
    return await this.productService.getAdminProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Get payment product by ID (Admin)',
    description: 'Retrieves details of a specific payment product.',
  })
  @ApiParam({ name: 'id', description: 'Product AutoIncrement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details',
    type: PaymentProductResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getProductById(
    @Param('id') id: AutoIncrementID,
  ): Promise<PaymentProductResDto> {
    return await this.productService.getAdminProductById(id);
  }

  @Post('products/sync-polar')
  @ApiOperation({
    summary: 'Synchronize products from Polar (Admin)',
    description:
      'Fetches active products directly from Polar API and synchronizes them into the database.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products synchronized successfully',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PaymentProduct),
  )
  async syncProductsFromPolar() {
    return await this.productService.syncAllProductsFromPolar();
  }

  @Get('benefits')
  @ApiOperation({
    summary: 'Get available Polar benefits (Admin)',
    description:
      'Retrieves all available benefits defined in Polar for product attachment.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of Polar benefits',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getBenefits() {
    return await this.productService.getPolarBenefits();
  }

  @Post('benefits')
  @ApiOperation({
    summary: 'Create a new Polar benefit (Admin)',
    description:
      'Creates a new benefit on Polar that can be attached to products.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Benefit created successfully',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PaymentProduct),
  )
  async createBenefit(@Body() dto: CreateBenefitReqDto) {
    return await this.productService.createBenefit(dto);
  }

  @Delete('benefits/:id')
  @ApiOperation({
    summary: 'Delete a Polar benefit (Admin)',
    description:
      'Deletes a benefit from Polar. WARNING: This will revoke all grants associated with this benefit.',
  })
  @ApiParam({ name: 'id', description: 'Polar Benefit ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Benefit deleted successfully',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PaymentProduct),
  )
  async deleteBenefit(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.productService.deleteBenefit(id);
    return { success: true };
  }

  @Post('products')
  @ApiOperation({
    summary: 'Create a new pricing product (Admin)',
    description:
      'Creates a new pricing plan and product in the system with Polar Product ID integration.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: PaymentProductResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PaymentProduct),
  )
  async createProduct(
    @Body() dto: CreateProductReqDto,
  ): Promise<PaymentProductResDto> {
    return await this.productService.createProduct(dto);
  }

  @Put('products/:id')
  @ApiOperation({
    summary: 'Update pricing product (Admin)',
    description: 'Updates configuration or Polar product ID of a plan.',
  })
  @ApiParam({ name: 'id', description: 'Product AutoIncrement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: PaymentProductResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PaymentProduct),
  )
  async updateProduct(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateProductReqDto,
  ): Promise<PaymentProductResDto> {
    return await this.productService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({
    summary: 'Delete pricing product (Admin)',
    description: 'Removes a pricing product from the database.',
  })
  @ApiParam({ name: 'id', description: 'Product AutoIncrement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PaymentProduct),
  )
  async deleteProduct(
    @Param('id') id: AutoIncrementID,
  ): Promise<{ success: boolean }> {
    await this.productService.deleteProduct(id);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Orders, Transactions & Subscriptions (Admin)
  // ---------------------------------------------------------------------------

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
    return await this.paymentService.getAdminOrders(query);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get all payment transactions / ledger (Admin)',
    description:
      'Retrieves a paginated list of all charge and refund transactions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of payment transactions',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getTransactions(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentTransactionResDto>> {
    return await this.paymentService.getAdminTransactions(query);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Get all subscriptions (Admin)',
    description:
      'Retrieves a paginated list of all SaaS recurring subscriptions.',
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
    return await this.paymentService.getAdminSubscriptions(query);
  }

  @Get('users/:userId/summary')
  @ApiOperation({
    summary: 'Get user payment and subscription summary (Admin)',
    description:
      'Retrieves subscriptions, recent orders, and lifetime value for a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User AutoIncrement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payment summary',
    type: UserPaymentSummaryResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getUserPaymentSummary(
    @Param('userId') userId: AutoIncrementID,
  ): Promise<UserPaymentSummaryResDto> {
    return await this.paymentService.getUserPaymentSummary(userId);
  }

  // ---------------------------------------------------------------------------
  // Refund Management (Admin)
  // ---------------------------------------------------------------------------

  @Get('refund-requests')
  @ApiOperation({
    summary: 'Get all refund requests (Admin)',
    description:
      'Retrieves a paginated list of all customer-submitted refund requests.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of refund requests',
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
      'Approves or rejects a pending refund request. Approving automatically triggers Polar gateway refund.',
  })
  @ApiParam({ name: 'id', description: 'Refund Request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund request reviewed successfully',
    type: PaymentRefundRequestResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async reviewRefundRequest(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Body() dto: ReviewRefundRequestReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<PaymentRefundRequestResDto> {
    return await this.paymentService.reviewRefundRequest(adminId, id, dto);
  }

  @Post('orders/:id/direct-refund')
  @ApiOperation({
    summary: 'Direct refund an order (Admin)',
    description:
      'Directly executes a refund for a paid order via Polar without requiring prior customer submission.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order refunded successfully',
    type: PaymentOrderResDto,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async directRefundOrder(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Body() dto: DirectRefundReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<PaymentOrderResDto> {
    return await this.paymentService.directRefundOrder(adminId, id, dto);
  }
}
