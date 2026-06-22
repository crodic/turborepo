import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImpersonateLogHistories1780192150000 implements MigrationInterface {
  name = 'AddImpersonateLogHistories1780192150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."impersonate_history_status_enum" AS ENUM('active', 'stopped')
    `);

    await queryRunner.query(`
      CREATE TABLE "impersonate_log_histories" (
        "id" BIGSERIAL NOT NULL,
        "session_id" bigint NOT NULL,
        "admin_id" bigint NOT NULL,
        "target_user_id" bigint NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."impersonate_history_status_enum" NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "stopped_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_impersonate_log_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_impersonate_log_histories_session_id" UNIQUE ("session_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_session_id"
      ON "impersonate_log_histories" ("session_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_admin_id"
      ON "impersonate_log_histories" ("admin_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_target_user_id"
      ON "impersonate_log_histories" ("target_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_status"
      ON "impersonate_log_histories" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_started_at"
      ON "impersonate_log_histories" ("started_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_log_histories_stopped_at"
      ON "impersonate_log_histories" ("stopped_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories"
      ADD CONSTRAINT "FK_impersonate_log_histories_session"
      FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories"
      ADD CONSTRAINT "FK_impersonate_log_histories_admin"
      FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories"
      ADD CONSTRAINT "FK_impersonate_log_histories_target_user"
      FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "impersonate_logs"
      ADD COLUMN "history_id" bigint
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_impersonate_logs_history_id"
      ON "impersonate_logs" ("history_id")
    `);

    await queryRunner.query(`
      INSERT INTO "impersonate_log_histories" (
        "session_id",
        "admin_id",
        "target_user_id",
        "reason",
        "status",
        "started_at",
        "stopped_at",
        "expires_at",
        "ip_address",
        "user_agent",
        "created_at"
      )
      SELECT
        logs."session_id",
        MIN(logs."admin_id") AS "admin_id",
        MIN(logs."target_user_id") AS "target_user_id",
        'Legacy impersonation session' AS "reason",
        CASE
          WHEN MAX(sessions."revoked_at") IS NULL THEN 'active'::"public"."impersonate_history_status_enum"
          ELSE 'stopped'::"public"."impersonate_history_status_enum"
        END AS "status",
        MIN(logs."created_at") AS "started_at",
        MAX(sessions."revoked_at") AS "stopped_at",
        MAX(sessions."expires_at") AS "expires_at",
        MIN(logs."ip_address") AS "ip_address",
        MIN(logs."user_agent") AS "user_agent",
        MIN(logs."created_at") AS "created_at"
      FROM "impersonate_logs" logs
      INNER JOIN "sessions" sessions ON sessions."id" = logs."session_id"
      GROUP BY logs."session_id"
      ON CONFLICT ("session_id") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "impersonate_logs" logs
      SET "history_id" = histories."id"
      FROM "impersonate_log_histories" histories
      WHERE histories."session_id" = logs."session_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "impersonate_logs"
      ADD CONSTRAINT "FK_impersonate_logs_history"
      FOREIGN KEY ("history_id") REFERENCES "impersonate_log_histories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "impersonate_logs" DROP CONSTRAINT "FK_impersonate_logs_history"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_logs_history_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_logs" DROP COLUMN "history_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_target_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_admin"
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_session"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_stopped_at"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_started_at"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_status"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_target_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_admin_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_impersonate_log_histories_session_id"
    `);
    await queryRunner.query(`DROP TABLE "impersonate_log_histories"`);
    await queryRunner.query(
      `DROP TYPE "public"."impersonate_history_status_enum"`,
    );
  }
}
