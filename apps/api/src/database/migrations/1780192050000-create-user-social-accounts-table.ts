import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSocialAccountsTable1780192050000 implements MigrationInterface {
  name = 'CreateUserSocialAccountsTable1780192050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."user_social_accounts_provider_enum" AS ENUM('google')
    `);

    await queryRunner.query(`
      CREATE TABLE "user_social_accounts" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "provider" "public"."user_social_accounts_provider_enum" NOT NULL,
        "provider_account_id" character varying(255) NOT NULL,
        "email" character varying,
        "email_verified" boolean NOT NULL DEFAULT false,
        "display_name" character varying(255),
        "avatar_url" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_social_account_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_social_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_social_account_provider_account"
      ON "user_social_accounts" ("provider", "provider_account_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_social_account_user_provider"
      ON "user_social_accounts" ("user_id", "provider")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_user_social_account_user_provider"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."UQ_user_social_account_provider_account"
    `);
    await queryRunner.query(`
      DROP TABLE "user_social_accounts"
    `);
    await queryRunner.query(`
      DROP TYPE "public"."user_social_accounts_provider_enum"
    `);
  }
}
