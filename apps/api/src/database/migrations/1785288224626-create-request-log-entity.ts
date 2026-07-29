import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequestLogEntity1785288224626 implements MigrationInterface {
  name = 'CreateRequestLogEntity1785288224626';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "request_logs" ("id" BIGSERIAL NOT NULL, "method" character varying(10) NOT NULL, "path" character varying NOT NULL, "status" integer NOT NULL, "ip" character varying, "browser" character varying, "os" character varying, "device" character varying, "latitude" numeric(10,6), "longitude" numeric(10,6), "source" character varying, "duration" integer, "userId" character varying, "guard" character varying, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_request_log_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_method" ON "request_logs" ("method") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_path" ON "request_logs" ("path") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_status" ON "request_logs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_request_logs_ip" ON "request_logs" ("ip") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_request_logs_ip"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_request_logs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_request_logs_path"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_request_logs_method"`);
    await queryRunner.query(`DROP TABLE "request_logs"`);
  }
}
