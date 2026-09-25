import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentProductsTable1780192750000 implements MigrationInterface {
  name = 'CreatePaymentProductsTable1780192750000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_products" (
        "id" BIGSERIAL NOT NULL,
        "plan_slug" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "interval" character varying(20) NOT NULL,
        "price" integer NOT NULL DEFAULT 0,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "prices" jsonb NOT NULL DEFAULT '[]',
        "polar_product_id" character varying(150) NOT NULL DEFAULT '',
        "features" jsonb NOT NULL DEFAULT '[]',
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "benefits" jsonb NOT NULL DEFAULT '[]',
        "medias" jsonb NOT NULL DEFAULT '[]',
        "trial_interval" character varying(20),
        "trial_interval_count" integer,
        "badge" character varying(100),
        "cta_text" character varying(100) NOT NULL DEFAULT 'Get Started',
        "is_popular" boolean NOT NULL DEFAULT false,
        "is_free" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_product_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_products_slug_interval" UNIQUE ("plan_slug", "interval")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_products_plan_slug" ON "payment_products" ("plan_slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_products_interval" ON "payment_products" ("interval")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_products_is_active" ON "payment_products" ("is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_products_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_products_interval"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_products_plan_slug"`,
    );
    await queryRunner.query(`DROP TABLE "payment_products"`);
  }
}
