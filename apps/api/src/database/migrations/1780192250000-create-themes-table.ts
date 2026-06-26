import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThemesTable1780192250000 implements MigrationInterface {
  name = 'CreateThemesTable1780192250000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."theme_status_enum" AS ENUM('draft', 'published')
    `);

    await queryRunner.query(`
      CREATE TABLE "themes" (
        "id" BIGSERIAL NOT NULL,
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "styles" jsonb NOT NULL,
        "status" "public"."theme_status_enum" NOT NULL DEFAULT 'draft',
        "is_default" boolean NOT NULL DEFAULT false,
        "created_by_admin_id" bigint,
        "updated_by_admin_id" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_theme_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_themes_slug" ON "themes" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_themes_status" ON "themes" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_themes_is_default" ON "themes" ("is_default")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_themes_created_by_admin_id" ON "themes" ("created_by_admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_themes_updated_by_admin_id" ON "themes" ("updated_by_admin_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD CONSTRAINT "FK_themes_created_by_admin"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD CONSTRAINT "FK_themes_updated_by_admin"
      FOREIGN KEY ("updated_by_admin_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "themes" DROP CONSTRAINT "FK_themes_updated_by_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP CONSTRAINT "FK_themes_created_by_admin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_themes_updated_by_admin_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_themes_created_by_admin_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_themes_is_default"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_themes_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_themes_slug"`);
    await queryRunner.query(`DROP TABLE "themes"`);
    await queryRunner.query(`DROP TYPE "public"."theme_status_enum"`);
  }
}
