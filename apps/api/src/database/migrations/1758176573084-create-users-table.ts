import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1758176573084 implements MigrationInterface {
  name = 'CreateUsersTable1758176573084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_domain_enum" AS ENUM('client', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'blocked')`,
    );

    // Users Table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" BIGSERIAL NOT NULL,
        "email" character varying(255) NOT NULL,
        "password" character varying(255),
        "first_name" character varying(100),
        "last_name" character varying(100),
        "full_name" character varying(255) GENERATED ALWAYS AS (TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) STORED,
        "avatar_url" character varying(500),
        "phone" character varying(50),
        "domain" "public"."users_domain_enum" NOT NULL DEFAULT 'client',
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'active',
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "is_phone_verified" boolean NOT NULL DEFAULT false,
        "locale" character varying(10) DEFAULT 'en',
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email_domain_unique" ON "users" ("email", "domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_domain_status" ON "users" ("domain", "status")`,
    );

    // Admin Profiles Table
    await queryRunner.query(`
      CREATE TABLE "admin_profiles" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "bio" text,
        "notifications" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_a3d9676173d45095f26252902b1" UNIQUE ("user_id"),
        CONSTRAINT "FK_admin_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_admin_profiles_user_id" ON "admin_profiles" ("user_id")`,
    );

    // User Profiles Table
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "bio" text,
        "birthday" date,
        "notifications" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_6ca9503d77ae39b4b5a6cc3ba88" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_profiles_user_id" ON "user_profiles" ("user_id")`,
    );

    // Two Factors Table
    await queryRunner.query(`
      CREATE TABLE "two_factors" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT false,
        "secret" character varying,
        "backup_codes" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_two_factors_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_2da130a1f2b816d0c2d0318a3b6" UNIQUE ("user_id"),
        CONSTRAINT "FK_two_factors_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_two_factors_user_id" ON "two_factors" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "typeorm_metadata" (
        "type" character varying NOT NULL,
        "database" character varying,
        "schema" character varying,
        "table" character varying,
        "name" character varying,
        "value" text
      )
    `);
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), current_schema(), 'users', 'GENERATED_COLUMN', 'full_name', 'TRIM(COALESCE(first_name, '''') || '' '' || COALESCE(last_name, ''''))')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = 'GENERATED_COLUMN' AND "name" = 'full_name' AND "table" = 'users'`,
    );
    await queryRunner.query(`DROP TABLE "two_factors"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
    await queryRunner.query(`DROP TABLE "admin_profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_domain_enum"`);
  }
}
