import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImpersonateLogsTable1780191750000 implements MigrationInterface {
  name = 'CreateImpersonateLogsTable1780191750000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."impersonate_history_status_enum" AS ENUM('active', 'stopped')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."impersonate_log_status_enum" AS ENUM('success', 'failed')
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
      CREATE TABLE "impersonate_logs" (
        "id" BIGSERIAL NOT NULL,
        "history_id" bigint,
        "session_id" bigint NOT NULL,
        "admin_id" bigint NOT NULL,
        "target_user_id" bigint NOT NULL,
        "action" character varying NOT NULL,
        "method" character varying NOT NULL,
        "endpoint" character varying NOT NULL,
        "entity_type" character varying,
        "entity_id" character varying,
        "input" jsonb,
        "output" jsonb,
        "before" jsonb,
        "after" jsonb,
        "changed_fields" jsonb,
        "status" "public"."impersonate_log_status_enum" NOT NULL,
        "error_message" text,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_impersonate_log_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_history_id" ON "impersonate_logs" ("history_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_session_id" ON "impersonate_logs" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_admin_id" ON "impersonate_logs" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_target_user_id" ON "impersonate_logs" ("target_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_action" ON "impersonate_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_method" ON "impersonate_logs" ("method")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_entity_type" ON "impersonate_logs" ("entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_entity_id" ON "impersonate_logs" ("entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_status" ON "impersonate_logs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_impersonate_logs_created_at" ON "impersonate_logs" ("created_at")`,
    );

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
      ADD CONSTRAINT "FK_impersonate_logs_session"
      FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "impersonate_logs"
      ADD CONSTRAINT "FK_impersonate_logs_history"
      FOREIGN KEY ("history_id") REFERENCES "impersonate_log_histories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "impersonate_logs" DROP CONSTRAINT "FK_impersonate_logs_history"`,
    );
    await queryRunner.query(
      `ALTER TABLE "impersonate_logs" DROP CONSTRAINT "FK_impersonate_logs_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_target_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "impersonate_log_histories" DROP CONSTRAINT "FK_impersonate_log_histories_session"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_entity_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_entity_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_method"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_action"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_target_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_admin_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_logs_history_id"`,
    );
    await queryRunner.query(`DROP TABLE "impersonate_logs"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_stopped_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_started_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_target_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_admin_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_impersonate_log_histories_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "impersonate_log_histories"`);
    await queryRunner.query(`DROP TYPE "public"."impersonate_log_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."impersonate_history_status_enum"`,
    );
  }
}
