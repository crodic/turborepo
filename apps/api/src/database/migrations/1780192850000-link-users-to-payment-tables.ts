import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkUsersToPaymentTables1780192850000 implements MigrationInterface {
  name = 'LinkUsersToPaymentTables1780192850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. payment_customers
    await queryRunner.query(`
      ALTER TABLE "payment_customers" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_customers" 
      ADD CONSTRAINT "FK_payment_customers_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 2. payment_orders
    await queryRunner.query(`
      ALTER TABLE "payment_orders" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_orders" 
      ADD CONSTRAINT "FK_payment_orders_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 3. payment_subscriptions
    await queryRunner.query(`
      ALTER TABLE "payment_subscriptions" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_subscriptions" 
      ADD CONSTRAINT "FK_payment_subscriptions_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 4. payment_transactions
    await queryRunner.query(`
      ALTER TABLE "payment_transactions" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions" 
      ADD CONSTRAINT "FK_payment_transactions_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_transactions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_subscriptions" DROP CONSTRAINT "FK_payment_subscriptions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_orders" DROP CONSTRAINT "FK_payment_orders_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_customers" DROP CONSTRAINT "FK_payment_customers_user_id"`,
    );

    // Revert types back to character varying(100)
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_subscriptions" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_orders" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_customers" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
  }
}
