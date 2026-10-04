import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1758176745032 implements MigrationInterface {
  name = 'CreateSessionsTable1758176745032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_sessions" (
        "id" BIGSERIAL NOT NULL,
        "hash" character varying(255) NOT NULL,
        "admin_user_id" bigint NOT NULL,
        "ip_address" character varying,
        "user_agent" character varying,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_session_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_sessions_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_sessions_admin_user_id" ON "admin_sessions" ("admin_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_sessions_revoked_at" ON "admin_sessions" ("revoked_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" BIGSERIAL NOT NULL,
        "hash" character varying(255) NOT NULL,
        "user_id" bigint NOT NULL,
        "ip_address" character varying,
        "user_agent" character varying,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_session_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_sessions_user_id" ON "user_sessions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_sessions_revoked_at" ON "user_sessions" ("revoked_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_user_sessions_revoked_at"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_user_sessions_user_id"
    `);
    await queryRunner.query(`
      DROP TABLE "user_sessions"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_admin_sessions_revoked_at"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_admin_sessions_admin_user_id"
    `);
    await queryRunner.query(`
      DROP TABLE "admin_sessions"
    `);
  }
}
