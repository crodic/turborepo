import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAccountsTable1780192050000 implements MigrationInterface {
  name = 'CreateUserAccountsTable1780192050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."accounts_provider_enum" AS ENUM('local', 'google', 'facebook', 'github')`,
    );

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "type" character varying(50) NOT NULL DEFAULT 'credentials',
        "provider" "public"."accounts_provider_enum" NOT NULL DEFAULT 'local',
        "provider_account_id" character varying(255) NOT NULL,
        "refresh_token" text,
        "access_token" text,
        "token_expires_at" TIMESTAMP WITH TIME ZONE,
        "token_type" character varying(50),
        "scope" character varying(500),
        "id_token" text,
        "profile_data" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_accounts_user_id" ON "accounts" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_accounts_provider" ON "accounts" ("provider")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_accounts_provider_provider_account_id_unique" ON "accounts" ("provider", "provider_account_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TYPE "public"."accounts_provider_enum"`);
  }
}
