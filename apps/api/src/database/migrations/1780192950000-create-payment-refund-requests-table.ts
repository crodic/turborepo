import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentRefundRequestsTable1780192950000 implements MigrationInterface {
  name = 'CreatePaymentRefundRequestsTable1780192950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."polar_refund_requests_status_enum" AS ENUM(
          'pending', 'approved', 'rejected', 'processed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "polar_refund_requests" (
        "id" BIGSERIAL NOT NULL,
        "order_id" bigint NOT NULL,
        "user_id" bigint,
        "amount" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'usd',
        "reason" character varying(100) NOT NULL,
        "customer_note" text,
        "status" "public"."polar_refund_requests_status_enum" NOT NULL DEFAULT 'pending',
        "admin_note" text,
        "reviewed_by" bigint,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "polar_refund_id" character varying(150),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_polar_refund_request_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_polar_refund_requests_order_id" ON "polar_refund_requests" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_polar_refund_requests_user_id" ON "polar_refund_requests" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_polar_refund_requests_status" ON "polar_refund_requests" ("status")`,
    );

    // Add foreign keys safely if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "polar_refund_requests" 
        ADD CONSTRAINT "FK_polar_refund_requests_order_id" 
        FOREIGN KEY ("order_id") REFERENCES "polar_orders"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "polar_refund_requests" 
        ADD CONSTRAINT "FK_polar_refund_requests_user_id" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "polar_refund_requests" 
        ADD CONSTRAINT "FK_polar_refund_requests_reviewed_by" 
        FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "polar_refund_requests" DROP CONSTRAINT IF EXISTS "FK_polar_refund_requests_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_refund_requests" DROP CONSTRAINT IF EXISTS "FK_polar_refund_requests_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_refund_requests" DROP CONSTRAINT IF EXISTS "FK_polar_refund_requests_order_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "polar_refund_requests"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."polar_refund_requests_status_enum"`,
    );
  }
}
