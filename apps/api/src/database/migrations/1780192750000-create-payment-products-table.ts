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
        "polar_product_id" character varying(150) NOT NULL DEFAULT '',
        "features" jsonb NOT NULL DEFAULT '[]',
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

    // Seed default pricing products with working Polar product IDs
    await queryRunner.query(`
      INSERT INTO "payment_products" (
        "plan_slug", "name", "description", "interval", "price", "currency",
        "polar_product_id", "features", "badge", "cta_text", "is_popular", "is_free", "is_active", "sort_order"
      ) VALUES
      (
        'starter',
        'Starter',
        'Perfect for hobbyists and side projects looking to explore.',
        'monthly',
        0,
        'usd',
        '',
        '["Up to 3 projects", "Community support", "Standard API access", "Basic analytics"]'::jsonb,
        NULL,
        'Get Started Free',
        false,
        true,
        true,
        1
      ),
      (
        'starter',
        'Starter',
        'Perfect for hobbyists and side projects looking to explore.',
        'yearly',
        0,
        'usd',
        '',
        '["Up to 3 projects", "Community support", "Standard API access", "Basic analytics"]'::jsonb,
        NULL,
        'Get Started Free',
        false,
        true,
        true,
        1
      ),
      (
        'pro',
        'Pro',
        'Everything growing businesses and indie hackers need to ship fast.',
        'monthly',
        19,
        'usd',
        'f6387289-7bfc-42cc-8e85-00d4a922dc9f',
        '["Unlimited projects & workspaces", "Priority email & chat support", "Advanced team collaboration", "High-speed API limits & Webhooks", "Custom branding & domains"]'::jsonb,
        'Most Popular',
        'Upgrade to Pro',
        true,
        false,
        true,
        2
      ),
      (
        'pro',
        'Pro',
        'Everything growing businesses and indie hackers need to ship fast.',
        'yearly',
        190,
        'usd',
        'adef1612-1370-4c35-be10-12d6f3030d07',
        '["Unlimited projects & workspaces", "Priority email & chat support", "Advanced team collaboration", "High-speed API limits & Webhooks", "Custom branding & domains"]'::jsonb,
        'Most Popular',
        'Upgrade to Pro',
        true,
        false,
        true,
        2
      ),
      (
        'enterprise',
        'Enterprise',
        'Dedicated power, compliance, and custom infrastructure for scale.',
        'monthly',
        79,
        'usd',
        'e806de5a-92c4-405b-8595-e0491aa3a51b',
        '["All Pro features included", "Dedicated account manager & 99.9% SLA", "Custom SSO (SAML, Okta, Google Workspace)", "Audit logs & enterprise compliance", "Custom contractual billing & invoices", "On-premise / private cloud deployment option"]'::jsonb,
        NULL,
        'Get Enterprise',
        false,
        false,
        true,
        3
      ),
      (
        'enterprise',
        'Enterprise',
        'Dedicated power, compliance, and custom infrastructure for scale.',
        'yearly',
        790,
        'usd',
        'c1901c77-5a47-41ba-a2eb-4b1ebc02420a',
        '["All Pro features included", "Dedicated account manager & 99.9% SLA", "Custom SSO (SAML, Okta, Google Workspace)", "Audit logs & enterprise compliance", "Custom contractual billing & invoices", "On-premise / private cloud deployment option"]'::jsonb,
        NULL,
        'Get Enterprise',
        false,
        false,
        true,
        3
      )
    `);
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
