import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUsersTable1758176573084 implements MigrationInterface {
  name = 'CreateAdminUsersTable1758176573084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            INSERT INTO "typeorm_metadata"(
                    "database",
                    "schema",
                    "table",
                    "type",
                    "name",
                    "value"
                )
            VALUES ($1, $2, $3, $4, $5, $6)
        `,
      [
        process.env.DATABASE_NAME!,
        'public',
        'admin_users',
        'GENERATED_COLUMN',
        'full_name',
        "first_name || ' ' || last_name",
      ],
    );
    await queryRunner.query(`
            CREATE TABLE "admin_users" (
                "id" BIGSERIAL NOT NULL,
                "first_name" character varying(100) NOT NULL,
                "last_name" character varying(100),
                "full_name" character varying(201) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "bio" character varying,
                "avatar" character varying,
                "birthday" date,
                "phone" character varying(20),
                "notifications" jsonb NOT NULL DEFAULT '{"email": true, "system": true, "security": true}'::jsonb,
                "two_factor_enabled" boolean NOT NULL DEFAULT false,
                "two_factor_secret" character varying,
                "two_factor_backup_codes" jsonb,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "verified_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_admin_user_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_admin_user_email" ON "admin_users" ("email")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_admin_user_email"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "database" = $3
                AND "schema" = $4
                AND "table" = $5
        `,
      [
        'GENERATED_COLUMN',
        'full_name',
        process.env.DATABASE_NAME!,
        'public',
        'admin_users',
      ],
    );
  }
}
