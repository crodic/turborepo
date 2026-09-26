import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { AdminPolarController } from './controllers/admin-polar.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PolarCustomFieldEntity } from './entities/polar-custom-field.entity';
import { PolarCustomerEntity } from './entities/polar-customer.entity';
import { PolarDiscountEntity } from './entities/polar-discount.entity';
import { PolarOrderEntity } from './entities/polar-order.entity';
import { PolarProductEntity } from './entities/polar-product.entity';
import { PolarRefundRequestEntity } from './entities/polar-refund-request.entity';
import { PolarSubscriptionEntity } from './entities/polar-subscription.entity';
import { PolarTransactionEntity } from './entities/polar-transaction.entity';
import { PolarWebhookEventEntity } from './entities/polar-webhook-event.entity';
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
      PolarCustomerEntity,
      PolarOrderEntity,
      PolarProductEntity,
      PolarRefundRequestEntity,
      PolarTransactionEntity,
      PolarSubscriptionEntity,
      PolarWebhookEventEntity,
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
