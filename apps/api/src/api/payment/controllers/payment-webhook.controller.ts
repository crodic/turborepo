import { Public } from '@/decorators/public.decorator';
import {
  Controller,
  ForbiddenException,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import type { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { PolarService } from '../services/polar.service';

@ApiTags('Payments - Webhook')
@Controller({
  path: 'payments/webhook',
  version: '1',
})
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly polarService: PolarService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @Public()
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
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const rawBody = req.rawBody || req.body;
    if (!rawBody) {
      this.logger.warn('Webhook received without raw body.');
      throw new ForbiddenException('Missing request body');
    }

    let event: Record<string, any>;
    try {
      event = this.polarService.validateWebhookEvent(rawBody, req.headers);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new ForbiddenException('Invalid Polar webhook signature');
      }
      throw error;
    }

    try {
      await this.paymentService.handleWebhook(event);
      return res.status(HttpStatus.ACCEPTED).send({ received: true });
    } catch (err: any) {
      this.logger.error(
        `Error processing webhook event: ${err.message}`,
        err.stack,
      );
      // Return 500 so Polar can retry later if our internal processing failed
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: err.message });
    }
  }
}
