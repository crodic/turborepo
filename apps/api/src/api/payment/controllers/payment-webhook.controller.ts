import { Public } from '@/decorators/public.decorator';
import {
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import type { Request } from 'express';
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';
import { PaymentService } from '../services/payment.service';

@ApiTags('Payments - Webhook')
@Controller({
  path: 'payments/webhook',
  version: '1',
})
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Handle incoming Polar webhooks',
    description:
      'Receives and cryptographically verifies webhook events from Polar. Synchronizes orders, subscriptions, transactions, and customer records.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Webhook received and accepted for processing',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Invalid webhook signature',
  })
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody || req.body;
    if (!rawBody) {
      this.logger.warn('Webhook received without raw body.');
      throw new ForbiddenException('Missing request body');
    }

    let event: Record<string, any>;
    try {
      const provider = this.gatewayFactory.getProvider('polar');
      event = await provider.validateWebhook(rawBody, req.headers);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new ForbiddenException('Invalid Polar webhook signature');
      }
      throw error;
    }

    const webhookId =
      (req.headers['webhook-id'] as string) ||
      (req.headers['webhook_id'] as string) ||
      undefined;

    await this.paymentService.handleWebhook(event, webhookId);
    return { received: true };
  }
}
