import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWhiteLabelsTable1780192350000 implements MigrationInterface {
  name = 'CreateWhiteLabelsTable1780192350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."white_label_target_enum" AS ENUM('admin', 'client')`,
    );

    await queryRunner.query(`
      CREATE TABLE "white_labels" (
        "id" BIGSERIAL NOT NULL,
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "target" "public"."white_label_target_enum" NOT NULL DEFAULT 'admin',
        "is_active" boolean NOT NULL DEFAULT false,
        "brand_name" character varying,
        "site_title" character varying,
        "site_tagline" character varying,
        "copyright_text" character varying,
        "site_logo" character varying,
        "site_dark_logo" character varying,
        "site_favicon" character varying,
        "og_image" character varying,
        "twitter_image" character varying,
        "meta_title" character varying,
        "meta_description" text,
        "canonical_url" character varying,
        "styles" jsonb NOT NULL,
        "created_by_admin_id" bigint,
        "updated_by_admin_id" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_white_label_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_white_labels_created_by_admin" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_white_labels_updated_by_admin" FOREIGN KEY ("updated_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_white_labels_slug" ON "white_labels" ("slug") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_white_labels_target_active" ON "white_labels" ("target") WHERE "is_active" = TRUE AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_white_labels_target" ON "white_labels" ("target")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_white_labels_is_active" ON "white_labels" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_white_labels_created_by_admin_id" ON "white_labels" ("created_by_admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_white_labels_updated_by_admin_id" ON "white_labels" ("updated_by_admin_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "white_labels"`);
    await queryRunner.query(`DROP TYPE "public"."white_label_target_enum"`);
  }
}
