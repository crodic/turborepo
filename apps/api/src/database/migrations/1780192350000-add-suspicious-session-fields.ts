import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuspiciousSessionFields1780192350000 implements MigrationInterface {
  name = 'AddSuspiciousSessionFields1780192350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD "is_suspicious" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD "suspicious_reasons" jsonb
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_is_suspicious"
      ON "sessions" ("is_suspicious")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_sessions_is_suspicious"`);
    await queryRunner.query(`
      ALTER TABLE "sessions" DROP COLUMN "suspicious_reasons"
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions" DROP COLUMN "is_suspicious"
    `);
  }
}
