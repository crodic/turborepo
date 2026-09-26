import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables1780192650000 implements MigrationInterface {
  name = 'CreatePaymentTables1780192650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. payment_customers
    await queryRunner.query(`
      CREATE TABLE "payment_customers" (
        "id" BIGSERIAL NOT NULL,
        "user_id" character varying(100),
        "polar_customer_id" character varying(150) NOT NULL,
        "email" character varying(255) NOT NULL,
        "name" character varying(255),
        "avatar_url" character varying(500),
        "billing_address" jsonb,
        "tax_id" character varying(100),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_customer_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_customers_user_id" ON "payment_customers" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_customers_polar_customer_id" ON "payment_customers" ("polar_customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_customers_email" ON "payment_customers" ("email")`,
    );

    // 2. payment_orders
    await queryRunner.query(`
      CREATE TYPE "public"."payment_orders_status_enum" AS ENUM(
        'pending', 'paid', 'failed', 'canceled', 'refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payment_orders" (
        "id" BIGSERIAL NOT NULL,
        "order_number" character varying(64) NOT NULL,
        "user_id" character varying(100),
        "customer_id" bigint,
        "customer_email" character varying(255) NOT NULL,
        "customer_name" character varying(255),
        "polar_checkout_id" character varying(150),
        "polar_order_id" character varying(150),
        "product_id" character varying(150) NOT NULL,
        "product_title" character varying(255),
        "amount" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "subtotal_amount" integer,
        "tax_amount" integer,
        "discount_amount" integer,
        "discount_id" character varying(150),
        "custom_field_data" jsonb,
        "invoice_url" character varying(500),
        "receipt_url" character varying(500),
        "status" "public"."payment_orders_status_enum" NOT NULL DEFAULT 'pending',
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_order_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_orders_order_number" ON "payment_orders" ("order_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_user_id" ON "payment_orders" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_customer_id" ON "payment_orders" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_customer_email" ON "payment_orders" ("customer_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_polar_checkout_id" ON "payment_orders" ("polar_checkout_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_polar_order_id" ON "payment_orders" ("polar_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_orders_status" ON "payment_orders" ("status")`,
    );

    // 3. payment_transactions
    await queryRunner.query(`
      CREATE TYPE "public"."payment_transactions_type_enum" AS ENUM(
        'charge', 'refund', 'dispute'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."payment_transactions_status_enum" AS ENUM(
        'pending', 'success', 'failed'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" BIGSERIAL NOT NULL,
        "user_id" character varying(100),
        "order_id" bigint,
        "subscription_id" bigint,
        "polar_payment_id" character varying(150),
        "type" "public"."payment_transactions_type_enum" NOT NULL DEFAULT 'charge',
        "status" "public"."payment_transactions_status_enum" NOT NULL DEFAULT 'pending',
        "amount" integer NOT NULL,
        "fee_amount" integer NOT NULL DEFAULT 0,
        "net_amount" integer NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "payment_method" character varying(50),
        "card_brand" character varying(50),
        "card_last4" character varying(4),
        "error_message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transaction_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_user_id" ON "payment_transactions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_order_id" ON "payment_transactions" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_subscription_id" ON "payment_transactions" ("subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_polar_payment_id" ON "payment_transactions" ("polar_payment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_status" ON "payment_transactions" ("status")`,
    );

    // 4. payment_subscriptions
    await queryRunner.query(`
      CREATE TYPE "public"."payment_subscriptions_status_enum" AS ENUM(
        'active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid', 'paused'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payment_subscriptions" (
        "id" BIGSERIAL NOT NULL,
        "user_id" character varying(100),
        "customer_id" bigint,
        "customer_email" character varying(255) NOT NULL,
        "polar_subscription_id" character varying(150) NOT NULL,
        "polar_customer_id" character varying(150),
        "product_id" character varying(150) NOT NULL,
        "amount" integer,
        "currency" character varying(10),
        "recurring_interval" character varying(20),
        "status" "public"."payment_subscriptions_status_enum" NOT NULL DEFAULT 'incomplete',
        "current_period_start" TIMESTAMP WITH TIME ZONE,
        "current_period_end" TIMESTAMP WITH TIME ZONE,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "discount_id" character varying(150),
        "custom_field_data" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_subscription_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_subscriptions_user_id" ON "payment_subscriptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_subscriptions_customer_id" ON "payment_subscriptions" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_subscriptions_customer_email" ON "payment_subscriptions" ("customer_email")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_subscriptions_polar_subscription_id" ON "payment_subscriptions" ("polar_subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_subscriptions_polar_customer_id" ON "payment_subscriptions" ("polar_customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_subscriptions_status" ON "payment_subscriptions" ("status")`,
    );

    // 5. payment_webhook_events
    await queryRunner.query(`
      CREATE TYPE "public"."payment_webhook_events_status_enum" AS ENUM(
        'pending', 'processed', 'failed'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payment_webhook_events" (
        "id" BIGSERIAL NOT NULL,
        "event_id" character varying(150) NOT NULL,
        "event_type" character varying(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "public"."payment_webhook_events_status_enum" NOT NULL DEFAULT 'pending',
        "error_message" text,
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_webhook_event_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_webhook_events_event_id" ON "payment_webhook_events" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_webhook_events_event_type" ON "payment_webhook_events" ("event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_webhook_events_status" ON "payment_webhook_events" ("status")`,
    );

    // 6. polar_discounts
    await queryRunner.query(`
      CREATE TABLE "polar_discounts" (
        "id" BIGSERIAL NOT NULL,
        "polar_discount_id" character varying(150) NOT NULL,
        "name" character varying(255) NOT NULL,
        "type" character varying(50) NOT NULL,
        "amount" integer,
        "basis_points" integer,
        "currency" character varying(10),
        "amounts" jsonb,
        "code" character varying(100),
        "duration" character varying(50) NOT NULL DEFAULT 'once',
        "duration_in_months" integer,
        "max_redemptions" integer,
        "redemptions_count" integer NOT NULL DEFAULT 0,
        "starts_at" TIMESTAMP WITH TIME ZONE,
        "ends_at" TIMESTAMP WITH TIME ZONE,
        "product_ids" jsonb NOT NULL DEFAULT '[]',
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_discount_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_polar_discounts_polar_discount_id" ON "polar_discounts" ("polar_discount_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_discounts_code" ON "polar_discounts" ("code")`,
    );

    // 7. polar_custom_fields
    await queryRunner.query(`
      CREATE TABLE "polar_custom_fields" (
        "id" BIGSERIAL NOT NULL,
        "polar_custom_field_id" character varying(150) NOT NULL,
        "type" character varying(50) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "properties" jsonb NOT NULL DEFAULT '{}',
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_custom_field_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_polar_custom_fields_polar_custom_field_id" ON "polar_custom_fields" ("polar_custom_field_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_custom_fields_slug" ON "polar_custom_fields" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop polar_custom_fields
    await queryRunner.query(
      `DROP INDEX "public"."IDX_polar_custom_fields_slug"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_polar_custom_fields_polar_custom_field_id"`,
    );
    await queryRunner.query(`DROP TABLE "polar_custom_fields"`);

    // Drop polar_discounts
    await queryRunner.query(`DROP INDEX "public"."IDX_polar_discounts_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_polar_discounts_polar_discount_id"`,
    );
    await queryRunner.query(`DROP TABLE "polar_discounts"`);
    // Drop payment_webhook_events
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_webhook_events_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_webhook_events_event_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_webhook_events_event_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_webhook_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_webhook_events_status_enum"`,
    );

    // Drop payment_subscriptions
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_subscriptions_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_subscriptions_polar_customer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_subscriptions_polar_subscription_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_subscriptions_customer_email"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_subscriptions_customer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_subscriptions_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_subscriptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_subscriptions_status_enum"`,
    );

    // Drop payment_transactions
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_polar_payment_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_subscription_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_transactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payment_transactions_type_enum"`,
    );

    // Drop payment_orders
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_orders_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_orders_polar_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_orders_polar_checkout_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_orders_customer_email"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_orders_customer_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_orders_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_orders_order_number"`,
    );
    await queryRunner.query(`DROP TABLE "payment_orders"`);
    await queryRunner.query(`DROP TYPE "public"."payment_orders_status_enum"`);

    // Drop payment_customers
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_customers_email"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_customers_polar_customer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_customers_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_customers"`);
  }
}
