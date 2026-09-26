import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolarPaymentTables1780192650000 implements MigrationInterface {
  name = 'CreatePolarPaymentTables1780192650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. polar_orders
    await queryRunner.query(`
      CREATE TYPE "public"."polar_orders_status_enum" AS ENUM(
        'pending', 'paid', 'failed', 'canceled', 'refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "polar_orders" (
        "id" BIGSERIAL NOT NULL,
        "order_number" character varying(64) NOT NULL,
        "user_id" bigint,
        "polar_order_id" character varying(150),
        "polar_checkout_id" character varying(150),
        "customer_email" character varying(255) NOT NULL,
        "customer_name" character varying(255),
        "product_id" character varying(150) NOT NULL,
        "product_title" character varying(255),
        "amount" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "status" "public"."polar_orders_status_enum" NOT NULL DEFAULT 'pending',
        "invoice_url" character varying(500),
        "receipt_url" character varying(500),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_order_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_polar_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_polar_orders_order_number" ON "polar_orders" ("order_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_orders_user_id" ON "polar_orders" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_orders_customer_email" ON "polar_orders" ("customer_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_orders_polar_order_id" ON "polar_orders" ("polar_order_id")`,
    );

    // 2. polar_subscriptions
    await queryRunner.query(`
      CREATE TYPE "public"."polar_subscriptions_status_enum" AS ENUM(
        'active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid', 'paused'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "polar_subscriptions" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint,
        "polar_subscription_id" character varying(150) NOT NULL,
        "polar_customer_id" character varying(150),
        "product_id" character varying(150) NOT NULL,
        "customer_email" character varying(255),
        "amount" integer,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "recurring_interval" character varying(20),
        "status" "public"."polar_subscriptions_status_enum" NOT NULL DEFAULT 'incomplete',
        "current_period_start" TIMESTAMP WITH TIME ZONE,
        "current_period_end" TIMESTAMP WITH TIME ZONE,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_subscription_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_polar_subscriptions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_polar_subscriptions_polar_subscription_id" ON "polar_subscriptions" ("polar_subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_subscriptions_user_id" ON "polar_subscriptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_subscriptions_polar_customer_id" ON "polar_subscriptions" ("polar_customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_subscriptions_status" ON "polar_subscriptions" ("status")`,
    );

    // 3. polar_webhook_events
    await queryRunner.query(`
      CREATE TYPE "public"."polar_webhook_events_status_enum" AS ENUM(
        'pending', 'processed', 'failed'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "polar_webhook_events" (
        "id" BIGSERIAL NOT NULL,
        "event_id" character varying(150) NOT NULL,
        "event_type" character varying(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "public"."polar_webhook_events_status_enum" NOT NULL DEFAULT 'pending',
        "error_message" text,
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_webhook_event_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_polar_webhook_events_event_id" ON "polar_webhook_events" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_webhook_events_event_type" ON "polar_webhook_events" ("event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_polar_webhook_events_status" ON "polar_webhook_events" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "polar_webhook_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."polar_webhook_events_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "polar_subscriptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."polar_subscriptions_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "polar_orders"`);
    await queryRunner.query(`DROP TYPE "public"."polar_orders_status_enum"`);
  }
}
