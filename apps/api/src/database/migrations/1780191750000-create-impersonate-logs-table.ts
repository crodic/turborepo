import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImpersonateLogsTable1780191750000 implements MigrationInterface {
  name = 'CreateImpersonateLogsTable1780191750000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."impersonate_log_status_enum" AS ENUM('success', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "impersonate_logs" (
        "id" BIGSERIAL NOT NULL,
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
      ALTER TABLE "impersonate_logs"
      ADD CONSTRAINT "FK_impersonate_logs_session"
      FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "impersonate_logs" DROP CONSTRAINT "FK_impersonate_logs_session"`,
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
    await queryRunner.query(`DROP TABLE "impersonate_logs"`);
    await queryRunner.query(`DROP TYPE "public"."impersonate_log_status_enum"`);
  }
}
