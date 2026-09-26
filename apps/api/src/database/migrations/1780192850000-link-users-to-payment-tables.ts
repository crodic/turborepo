import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkUsersToPaymentTables1780192850000 implements MigrationInterface {
  name = 'LinkUsersToPaymentTables1780192850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. polar_customers
    await queryRunner.query(`
      ALTER TABLE "polar_customers" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "polar_customers" 
      ADD CONSTRAINT "FK_polar_customers_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 2. polar_orders
    await queryRunner.query(`
      ALTER TABLE "polar_orders" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "polar_orders" 
      ADD CONSTRAINT "FK_polar_orders_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 3. polar_subscriptions
    await queryRunner.query(`
      ALTER TABLE "polar_subscriptions" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "polar_subscriptions" 
      ADD CONSTRAINT "FK_polar_subscriptions_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 4. polar_transactions
    await queryRunner.query(`
      ALTER TABLE "polar_transactions" 
      ALTER COLUMN "user_id" TYPE bigint 
      USING (NULLIF("user_id", '')::bigint)
    `);
    await queryRunner.query(`
      ALTER TABLE "polar_transactions" 
      ADD CONSTRAINT "FK_polar_transactions_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "polar_transactions" DROP CONSTRAINT "FK_polar_transactions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_subscriptions" DROP CONSTRAINT "FK_polar_subscriptions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_orders" DROP CONSTRAINT "FK_polar_orders_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_customers" DROP CONSTRAINT "FK_polar_customers_user_id"`,
    );

    // Revert types back to character varying(100)
    await queryRunner.query(
      `ALTER TABLE "polar_transactions" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_subscriptions" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_orders" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "polar_customers" ALTER COLUMN "user_id" TYPE character varying(100)`,
    );
  }
}
