import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1758176745032 implements MigrationInterface {
  name = 'CreateSessionsTable1758176745032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."sessions_user_enum" AS ENUM('AdminUserEntity', 'UserEntity')
        `);
    await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" BIGSERIAL NOT NULL,
                "hash" character varying(255) NOT NULL,
                "user_id" bigint NOT NULL,
                "user_type" "public"."sessions_user_enum" NOT NULL,
                "impersonated_by" bigint,
                "ip_address" character varying,
                "user_agent" character varying,
                "is_suspicious" boolean NOT NULL DEFAULT false,
                "suspicious_reasons" jsonb,
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_session_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_sessions_user_id" ON "sessions" ("user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_sessions_revoked_at" ON "sessions" ("revoked_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_sessions_impersonated_by" ON "sessions" ("impersonated_by")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_sessions_is_suspicious" ON "sessions" ("is_suspicious")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IDX_sessions_is_suspicious"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_sessions_impersonated_by"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_sessions_revoked_at"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_sessions_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "sessions"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."sessions_user_enum"
        `);
  }
}
