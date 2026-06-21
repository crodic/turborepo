import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSettingsTable1768710635248 implements MigrationInterface {
  name = 'CreateSettingsTable1768710635248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "settings" (
                "id" BIGSERIAL NOT NULL,
                "key" character varying NOT NULL,
                "value" jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "PK_setting_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
  CREATE UNIQUE INDEX "UQ_setting_key"
  ON "settings" ("key")
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_setting_key"
        `);
    await queryRunner.query(`
            DROP TABLE "settings"
        `);
  }
}
