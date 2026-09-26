import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PolarOrderEntity } from './entities/polar-order.entity';
import { PolarRefundRequestEntity } from './entities/polar-refund-request.entity';
import { PolarSubscriptionEntity } from './entities/polar-subscription.entity';
import { PolarWebhookEventEntity } from './entities/polar-webhook-event.entity';
import { PaymentService } from './services/payment.service';
import { PolarService } from './services/polar.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PolarOrderEntity,
      PolarSubscriptionEntity,
      PolarWebhookEventEntity,
      PolarRefundRequestEntity,
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
