import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PaymentTransactionResDto } from '../dto/payment-transaction.res.dto';
import { PaymentService } from '../services/payment.service';

@ApiTags('Admin - Payments')
@Controller({
  path: 'admin/payments',
  version: '1',
})
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('orders')
  @ApiOperation({
    summary: 'Get all payment orders (Admin)',
    description: 'Retrieves a paginated list of all orders across the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of payment orders',
  })
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
  async getSubscriptions(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PaymentSubscriptionResDto>> {
    return await this.paymentService.getAdminSubscriptions(query);
  }
}
