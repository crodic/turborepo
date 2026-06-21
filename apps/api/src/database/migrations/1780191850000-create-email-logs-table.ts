import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailLogsTable1780191850000 implements MigrationInterface {
  name = 'CreateEmailLogsTable1780191850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."email_log_source_enum" AS ENUM('system', 'admin')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."email_log_status_enum" AS ENUM('scheduled', 'sent', 'failed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" BIGSERIAL NOT NULL,
        "source" "public"."email_log_source_enum" NOT NULL,
        "status" "public"."email_log_status_enum" NOT NULL,
        "subject" character varying NOT NULL,
        "from_email" character varying NOT NULL,
        "to" jsonb NOT NULL,
        "cc" jsonb,
        "bcc" jsonb,
        "body" text,
        "rendered_body" text,
        "template_name" character varying,
        "attachments" jsonb,
        "scheduled_at" TIMESTAMP WITH TIME ZONE,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "failed_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "queue_job_id" character varying,
        "job_name" character varying,
        "attempts" integer NOT NULL DEFAULT 0,
        "created_by_admin_id" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_log_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_source" ON "email_logs" ("source")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_status" ON "email_logs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_scheduled_at" ON "email_logs" ("scheduled_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_sent_at" ON "email_logs" ("sent_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_queue_job_id" ON "email_logs" ("queue_job_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_job_name" ON "email_logs" ("job_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_created_by_admin_id" ON "email_logs" ("created_by_admin_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "FK_email_logs_created_by_admin"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_logs" DROP CONSTRAINT "FK_email_logs_created_by_admin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_email_logs_created_by_admin_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_email_logs_job_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_email_logs_queue_job_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_email_logs_sent_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_email_logs_scheduled_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_email_logs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_email_logs_source"`);
    await queryRunner.query(`DROP TABLE "email_logs"`);
    await queryRunner.query(`DROP TYPE "public"."email_log_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."email_log_source_enum"`);
  }
}
