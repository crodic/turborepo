import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PaymentCustomerEntity } from './entities/payment-customer.entity';
import { PaymentOrderEntity } from './entities/payment-order.entity';
import { PaymentSubscriptionEntity } from './entities/payment-subscription.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentWebhookEventEntity } from './entities/payment-webhook-event.entity';
import { PaymentService } from './services/payment.service';
import { PolarService } from './services/polar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCustomerEntity,
      PaymentOrderEntity,
      PaymentTransactionEntity,
      PaymentSubscriptionEntity,
      PaymentWebhookEventEntity,
    ]),
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    AdminPaymentController,
  ],
  providers: [PolarService, PaymentService],
  exports: [PolarService, PaymentService],
})
export class PaymentModule {}
