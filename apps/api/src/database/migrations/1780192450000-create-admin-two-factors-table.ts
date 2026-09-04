import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminTwoFactorsTable1780192450000 implements MigrationInterface {
  name = 'CreateAdminTwoFactorsTable1780192450000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_two_factors" (
        "id" BIGSERIAL NOT NULL,
        "admin_user_id" bigint NOT NULL,
        "secret" character varying NOT NULL,
        "backup_codes" jsonb,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_9d8d2bb4d21222b1ee2b98a8ed2" UNIQUE ("admin_user_id"),
        CONSTRAINT "PK_admin_two_factor_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_two_factors_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "admin_two_factors"
    `);
  }
}
