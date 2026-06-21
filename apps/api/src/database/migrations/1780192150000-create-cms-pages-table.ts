import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCmsPagesTable1780192150000 implements MigrationInterface {
  name = 'CreateCmsPagesTable1780192150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."cms_pages_status_enum" AS ENUM('draft', 'published')
    `);

    await queryRunner.query(`
      CREATE TABLE "cms_pages" (
        "id" BIGSERIAL NOT NULL,
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "status" "public"."cms_pages_status_enum" NOT NULL DEFAULT 'draft',
        "content" jsonb NOT NULL,
        "variables" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "seo_title" character varying,
        "seo_description" text,
        "seo_keywords" character varying,
        "og_title" character varying,
        "og_description" text,
        "og_image" character varying,
        "canonical_url" character varying,
        "robots" character varying,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "created_by" bigint,
        "updated_by" bigint,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cms_page_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cms_pages_created_by" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_cms_pages_updated_by" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_cms_pages_slug"
      ON "cms_pages" ("slug")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cms_pages_status"
      ON "cms_pages" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_cms_pages_status"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."UQ_cms_pages_slug"
    `);
    await queryRunner.query(`
      DROP TABLE "cms_pages"
    `);
    await queryRunner.query(`
      DROP TYPE "public"."cms_pages_status_enum"
    `);
  }
}
