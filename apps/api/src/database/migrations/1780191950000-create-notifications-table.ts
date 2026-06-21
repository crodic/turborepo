import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1780191950000 implements MigrationInterface {
  name = 'CreateNotificationsTable1780191950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" BIGSERIAL NOT NULL,
        "admin_id" bigint NOT NULL,
        "type" character varying(120) NOT NULL,
        "title" character varying(180) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_admin_id" ON "notifications" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_read_at" ON "notifications" ("read_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at")`,
    );
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_admin"
      FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_admin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_read_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_admin_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
