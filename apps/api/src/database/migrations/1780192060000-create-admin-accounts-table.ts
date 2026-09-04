import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminAccountsTable1780192060000 implements MigrationInterface {
  name = 'CreateAdminAccountsTable1780192060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."admin_accounts_provider_enum" AS ENUM('local', 'google')
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_accounts" (
        "id" BIGSERIAL NOT NULL,
        "admin_user_id" bigint NOT NULL,
        "provider" "public"."admin_accounts_provider_enum" NOT NULL DEFAULT 'local',
        "provider_account_id" character varying(255) NOT NULL,
        "password" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_account_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_accounts_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_admin_account_provider_account"
      ON "admin_accounts" ("provider", "provider_account_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_admin_account_admin_provider"
      ON "admin_accounts" ("admin_user_id", "provider")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_admin_account_admin_provider"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."UQ_admin_account_provider_account"
    `);
    await queryRunner.query(`
      DROP TABLE "admin_accounts"
    `);
    await queryRunner.query(`
      DROP TYPE "public"."admin_accounts_provider_enum"
    `);
  }
}
