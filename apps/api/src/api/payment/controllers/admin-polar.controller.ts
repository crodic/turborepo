import { AutoIncrementID } from '@/common/types/common.type';
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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CreateBenefitReqDto } from '../dto/create-benefit.req.dto';
import { CreateCustomFieldReqDto } from '../dto/create-custom-field.req.dto';
import { CreateCustomerReqDto } from '../dto/create-customer.req.dto';
import { CreateDiscountReqDto } from '../dto/create-discount.req.dto';
import { PaymentCustomerResDto } from '../dto/payment-customer.res.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PolarCustomFieldResDto } from '../dto/polar-custom-field.res.dto';
import { PolarDiscountResDto } from '../dto/polar-discount.res.dto';
import { UpdateCustomFieldReqDto } from '../dto/update-custom-field.req.dto';
import { UpdateCustomerReqDto } from '../dto/update-customer.req.dto';
import { UpdateDiscountReqDto } from '../dto/update-discount.req.dto';
import { CustomFieldService } from '../services/custom-field.service';
import { CustomerPaymentService } from '../services/customer-payment.service';
import { DiscountService } from '../services/discount.service';
import { PaymentService } from '../services/payment.service';
import { PolarService } from '../services/polar.service';

@ApiTags('Admin - Polar')
@Controller({
  path: 'admin/polar',
  version: '1',
})
@UseGuards(AdminAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class AdminPolarController {
  constructor(
    private readonly discountService: DiscountService,
    private readonly customFieldService: CustomFieldService,
    private readonly customerPaymentService: CustomerPaymentService,
    private readonly paymentService: PaymentService,
    private readonly polarService: PolarService,
  ) {}

  // ==========================================
  // DISCOUNTS
  // ==========================================

  @Get('discounts')
  @ApiOperation({ summary: 'List all promotional discounts (Paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PolarDiscountResDto] })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarDiscount),
  )
  async getDiscounts(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PolarDiscountResDto>> {
    return await this.discountService.getAdminDiscounts(query);
  }

  @Get('discounts/:id')
  @ApiOperation({ summary: 'Get a discount by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PolarDiscountResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarDiscount),
  )
  async getDiscount(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<PolarDiscountResDto> {
    return await this.discountService.getDiscountById(id);
  }

  @Post('discounts')
  @ApiOperation({ summary: 'Create a new discount on Polar' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PolarDiscountResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PolarDiscount),
  )
  async createDiscount(
    @Body() dto: CreateDiscountReqDto,
  ): Promise<PolarDiscountResDto> {
    return await this.discountService.createDiscount(dto);
  }

  @Put('discounts/:id')
  @ApiOperation({ summary: 'Update an existing discount' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PolarDiscountResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarDiscount),
  )
  async updateDiscount(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Body() dto: UpdateDiscountReqDto,
  ): Promise<PolarDiscountResDto> {
    return await this.discountService.updateDiscount(id, dto);
  }

  @Delete('discounts/:id')
  @ApiOperation({ summary: 'Delete a discount' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PolarDiscount),
  )
  async deleteDiscount(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<void> {
    await this.discountService.deleteDiscount(id);
  }

  @Post('discounts/sync')
  @ApiOperation({ summary: 'Sync discounts from Polar' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarDiscount),
  )
  async syncDiscounts(): Promise<{ synced: number }> {
    return await this.discountService.syncDiscounts();
  }

  // ==========================================
  // CUSTOM FIELDS
  // ==========================================

  @Get('custom-fields')
  @ApiOperation({ summary: 'List all custom checkout fields (Paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PolarCustomFieldResDto] })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomField),
  )
  async getCustomFields(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PolarCustomFieldResDto>> {
    return await this.customFieldService.getAdminCustomFields(query);
  }

  @Get('custom-fields/:id')
  @ApiOperation({ summary: 'Get a custom field by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PolarCustomFieldResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomField),
  )
  async getCustomField(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<PolarCustomFieldResDto> {
    return await this.customFieldService.getCustomFieldById(id);
  }

  @Post('custom-fields')
  @ApiOperation({ summary: 'Create a new custom checkout field on Polar' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PolarCustomFieldResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PolarCustomField),
  )
  async createCustomField(
    @Body() dto: CreateCustomFieldReqDto,
  ): Promise<PolarCustomFieldResDto> {
    return await this.customFieldService.createCustomField(dto);
  }

  @Put('custom-fields/:id')
  @ApiOperation({ summary: 'Update an existing custom field' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PolarCustomFieldResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarCustomField),
  )
  async updateCustomField(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Body() dto: UpdateCustomFieldReqDto,
  ): Promise<PolarCustomFieldResDto> {
    return await this.customFieldService.updateCustomField(id, dto);
  }

  @Delete('custom-fields/:id')
  @ApiOperation({ summary: 'Delete a custom field' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PolarCustomField),
  )
  async deleteCustomField(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<void> {
    await this.customFieldService.deleteCustomField(id);
  }

  @Post('custom-fields/sync')
  @ApiOperation({ summary: 'Sync custom fields from Polar' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarCustomField),
  )
  async syncCustomFields(): Promise<{ synced: number }> {
    return await this.customFieldService.syncCustomFields();
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================

  @Get('customers')
  @ApiOperation({ summary: 'List all customers (Paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentCustomerResDto] })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomer),
  )
  async getCustomers(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentCustomerResDto>> {
    return await this.customerPaymentService.getAdminCustomers(query);
  }

  @Get('customers/export')
  @ApiOperation({ summary: 'Export customers as CSV' })
  @ApiResponse({ status: HttpStatus.OK, type: String })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomer),
  )
  async exportCustomers(): Promise<string> {
    return await this.customerPaymentService.exportCustomers();
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentCustomerResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomer),
  )
  async getCustomer(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<PaymentCustomerResDto> {
    return await this.customerPaymentService.getCustomerById(id);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a new customer profile' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentCustomerResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PolarCustomer),
  )
  async createCustomer(
    @Body() dto: CreateCustomerReqDto,
  ): Promise<PaymentCustomerResDto> {
    return await this.customerPaymentService.createCustomer(dto);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: 'Update customer profile' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentCustomerResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarCustomer),
  )
  async updateCustomer(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Body() dto: UpdateCustomerReqDto,
  ): Promise<PaymentCustomerResDto> {
    return await this.customerPaymentService.updateCustomer(id, dto);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: 'Delete or anonymize customer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'anonymize', required: false, type: Boolean })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PolarCustomer),
  )
  async deleteCustomer(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
    @Query('anonymize') anonymize?: boolean,
  ): Promise<void> {
    await this.customerPaymentService.deleteCustomer(id, anonymize);
  }

  @Get('customers/:id/state')
  @ApiOperation({ summary: 'Get real-time customer state from Polar' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomer),
  )
  async getCustomerState(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<any> {
    return await this.customerPaymentService.getCustomerState(id);
  }

  @Get('customers/:id/payment-methods')
  @ApiOperation({ summary: 'Get saved payment methods of a customer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PolarCustomer),
  )
  async getCustomerPaymentMethods(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<any> {
    return await this.customerPaymentService.getCustomerPaymentMethods(id);
  }

  @Post('customers/sync')
  @ApiOperation({ summary: 'Sync customers from Polar' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PolarCustomer),
  )
  async syncCustomers(): Promise<{ synced: number }> {
    return await this.customerPaymentService.syncCustomers();
  }

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (Paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentSubscriptionResDto] })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getSubscriptions(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentSubscriptionResDto>> {
    return await this.paymentService.getAdminSubscriptions(query);
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel subscription at end of period' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentSubscriptionResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async cancelSubscription(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<PaymentSubscriptionResDto> {
    return await this.paymentService.cancelSubscription(id);
  }

  @Post('subscriptions/:id/revoke')
  @ApiOperation({ summary: 'Revoke subscription immediately' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentSubscriptionResDto })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Payment),
  )
  async revokeSubscription(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<PaymentSubscriptionResDto> {
    return await this.paymentService.revokeSubscription(id);
  }

  @Get('subscriptions/export')
  @ApiOperation({ summary: 'Export subscriptions as CSV' })
  @ApiResponse({ status: HttpStatus.OK, type: String })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async exportSubscriptions(): Promise<string> {
    return await this.paymentService.exportSubscriptions();
  }

  // ==========================================
  // ORDERS & INVOICES
  // ==========================================

  @Get('orders')
  @ApiOperation({ summary: 'List all orders (Paginated)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentOrderResDto] })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrders(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentOrderResDto>> {
    return await this.paymentService.getAdminOrders(query);
  }

  @Get('orders/:id/invoice')
  @ApiOperation({ summary: 'Get order invoice data' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrderInvoice(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<any> {
    return await this.paymentService.getOrderInvoice(id);
  }

  @Get('orders/:id/receipt')
  @ApiOperation({ summary: 'Get order receipt link' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrderReceipt(
    @Param('id', ParseIntPipe) id: AutoIncrementID,
  ): Promise<any> {
    return await this.paymentService.getOrderReceipt(id);
  }

  @Get('orders/export')
  @ApiOperation({ summary: 'Export orders as CSV' })
  @ApiResponse({ status: HttpStatus.OK, type: String })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async exportOrders(): Promise<string> {
    return await this.paymentService.exportOrders();
  }

  // ==========================================
  // CHECKOUT LINKS
  // ==========================================

  @Get('checkout-links')
  @ApiOperation({ summary: 'List all checkout links' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getCheckoutLinks(@Query('productId') productId?: string): Promise<any> {
    return await this.polarService.listCheckoutLinks({ productId });
  }

  @Get('checkout-links/:id')
  @ApiOperation({ summary: 'Get checkout link by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getCheckoutLink(@Param('id') id: string): Promise<any> {
    return await this.polarService.getCheckoutLink(id);
  }

  @Post('checkout-links')
  @ApiOperation({ summary: 'Create a new checkout link' })
  @ApiResponse({ status: HttpStatus.CREATED })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PaymentProduct),
  )
  async createCheckoutLink(@Body() body: any): Promise<any> {
    return await this.polarService.createCheckoutLink(body);
  }

  @Put('checkout-links/:id')
  @ApiOperation({ summary: 'Update a checkout link' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PaymentProduct),
  )
  async updateCheckoutLink(
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<any> {
    return await this.polarService.updateCheckoutLink(id, body);
  }

  @Delete('checkout-links/:id')
  @ApiOperation({ summary: 'Delete a checkout link' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PaymentProduct),
  )
  async deleteCheckoutLink(@Param('id') id: string): Promise<void> {
    await this.polarService.deleteCheckoutLink(id);
  }

  // ==========================================
  // ANALYTICS & METRICS
  // ==========================================

  @Get('analytics/metrics')
  @ApiOperation({ summary: 'Get polar analytics metrics' })
  @ApiQuery({ name: 'startDate', type: String })
  @ApiQuery({ name: 'endDate', type: String })
  @ApiQuery({ name: 'interval', enum: ['day', 'week', 'month', 'year'] })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'day' | 'week' | 'month' | 'year',
    @Query('organizationId') organizationId?: string,
    @Query('productId') productId?: string,
    @Query('customerId') customerId?: string,
  ): Promise<any> {
    return await this.polarService.getMetrics({
      startDate,
      endDate,
      interval,
      organizationId,
      productId,
      customerId,
    });
  }

  @Get('analytics/limits')
  @ApiOperation({ summary: 'Get analytics limits' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getMetricsLimits(): Promise<any> {
    return await this.polarService.getMetricsLimits();
  }

  // ==========================================
  // BENEFITS & BENEFIT GRANTS
  // ==========================================

  @Get('benefits')
  @ApiOperation({ summary: 'List all benefits from Polar' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getBenefits(): Promise<any[]> {
    return await this.polarService.listBenefits();
  }

  @Get('benefits/:id')
  @ApiOperation({ summary: 'Get a benefit by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getBenefit(@Param('id') id: string): Promise<any> {
    return await this.polarService.getBenefit(id);
  }

  @Post('benefits')
  @ApiOperation({ summary: 'Create a new benefit on Polar' })
  @ApiResponse({ status: HttpStatus.CREATED })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.PaymentProduct),
  )
  async createBenefit(@Body() dto: CreateBenefitReqDto): Promise<any> {
    return await this.polarService.createBenefit(dto);
  }

  @Put('benefits/:id')
  @ApiOperation({ summary: 'Update a benefit on Polar' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.PaymentProduct),
  )
  async updateBenefit(
    @Param('id') id: string,
    @Body() body: { description?: string; properties?: Record<string, any> },
  ): Promise<any> {
    return await this.polarService.updateBenefit(id, body);
  }

  @Delete('benefits/:id')
  @ApiOperation({ summary: 'Delete a benefit from Polar' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.PaymentProduct),
  )
  async deleteBenefit(@Param('id') id: string): Promise<void> {
    await this.polarService.deleteBenefit(id);
  }

  @Get('benefits/:id/grants')
  @ApiOperation({ summary: 'List individual user grants for a benefit' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.PaymentProduct),
  )
  async getBenefitGrants(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return await this.polarService.listBenefitGrants({
      benefitId: id,
      page,
      limit,
    });
  }

  // ==========================================
  // ORGANIZATIONS
  // ==========================================

  @Get('organizations')
  @ApiOperation({ summary: 'List connected Polar organizations' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrganizations(): Promise<any> {
    return await this.polarService.listOrganizations();
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Payment),
  )
  async getOrganization(@Param('id') id: string): Promise<any> {
    return await this.polarService.getOrganization(id);
  }
}
