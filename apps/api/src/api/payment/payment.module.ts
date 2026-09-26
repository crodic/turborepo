import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { AdminPolarController } from './controllers/admin-polar.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PaymentCustomerEntity } from './entities/payment-customer.entity';
import { PaymentOrderEntity } from './entities/payment-order.entity';
import { PaymentProductEntity } from './entities/payment-product.entity';
import { PaymentRefundRequestEntity } from './entities/payment-refund-request.entity';
import { PaymentSubscriptionEntity } from './entities/payment-subscription.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentWebhookEventEntity } from './entities/payment-webhook-event.entity';
import { PolarCustomFieldEntity } from './entities/polar-custom-field.entity';
import { PolarDiscountEntity } from './entities/polar-discount.entity';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';
import { PolarProvider } from './providers/polar.provider';
import { CustomFieldService } from './services/custom-field.service';
import { CustomerPaymentService } from './services/customer-payment.service';
import { DiscountService } from './services/discount.service';
import { PaymentService } from './services/payment.service';
import { PolarService } from './services/polar.service';
import { ProductService } from './services/product.service';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCustomerEntity,
      PaymentOrderEntity,
      PaymentProductEntity,
      PaymentRefundRequestEntity,
      PaymentTransactionEntity,
      PaymentSubscriptionEntity,
      PaymentWebhookEventEntity,
      PolarDiscountEntity,
      PolarCustomFieldEntity,
      UserEntity,
    ]),
    NotificationModule,
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    AdminPaymentController,
    AdminPolarController,
  ],
  providers: [
    PolarService,
    PolarProvider,
    PaymentGatewayFactory,
    PaymentService,
    ProductService,
    DiscountService,
    CustomFieldService,
    CustomerPaymentService,
  ],
  exports: [
    PolarService,
    PolarProvider,
    PaymentGatewayFactory,
    PaymentService,
    ProductService,
    DiscountService,
    CustomFieldService,
    CustomerPaymentService,
  ],
})
export class PaymentModule {}
