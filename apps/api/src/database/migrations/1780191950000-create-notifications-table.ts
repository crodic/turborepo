import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1780191950000 implements MigrationInterface {
  name = 'CreateNotificationsTable1780191950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "type" character varying(120) NOT NULL,
        "title" character varying(180) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
