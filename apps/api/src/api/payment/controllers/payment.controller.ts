import { CurrentUser } from '@/decorators/current-user.decorator';
import { Public } from '@/decorators/public.decorator';
import { UserAuthGuard } from '@/guards/user-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCheckoutReqDto } from '../dto/create-checkout.req.dto';
import { CreateCheckoutResDto } from '../dto/create-checkout.res.dto';
import { CustomerPortalReqDto } from '../dto/customer-portal.req.dto';
import { CustomerPortalResDto } from '../dto/customer-portal.res.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PaymentService } from '../services/payment.service';

@ApiTags('Payments')
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @Public()
  @ApiOperation({
    summary: 'Create a Polar checkout session',
    description:
      'Initiates a checkout session on Polar for one-time purchases or subscriptions. Returns a checkout URL to redirect the user to.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Checkout session created successfully',
    type: CreateCheckoutResDto,
  })
  async createCheckout(
    @Body() dto: CreateCheckoutReqDto,
    @CurrentUser()
    user?: { id?: string | number; email?: string; fullName?: string },
  ): Promise<CreateCheckoutResDto> {
    return await this.paymentService.createCheckout(dto, user);
  }

  @Post('customer-portal')
  @Public()
  @ApiOperation({
    summary: 'Create a Customer Portal session',
    description:
      'Creates a pre-authenticated session for the Polar Customer Portal where customers can manage their payment methods, invoices, and subscriptions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer Portal URL generated successfully',
    type: CustomerPortalResDto,
  })
  async createCustomerPortal(
    @Body() dto: CustomerPortalReqDto,
    @CurrentUser() user?: { id?: string | number; email?: string },
  ): Promise<CustomerPortalResDto> {
    return await this.paymentService.createCustomerPortalSession(dto, user);
  }

  @Get('orders')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user payment orders',
    description:
      'Retrieves the list of payment orders belonging to the authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user payment orders',
    type: [PaymentOrderResDto],
  })
  async getMyOrders(
    @CurrentUser('id') userId: string,
  ): Promise<PaymentOrderResDto[]> {
    return await this.paymentService.getUserOrders(String(userId));
  }

  @Get('subscriptions')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user subscriptions',
    description:
      'Retrieves active and historical subscriptions of the authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user subscriptions',
    type: [PaymentSubscriptionResDto],
  })
  async getMySubscriptions(
    @CurrentUser('id') userId: string,
  ): Promise<PaymentSubscriptionResDto[]> {
    return await this.paymentService.getUserSubscriptions(String(userId));
  }
}
