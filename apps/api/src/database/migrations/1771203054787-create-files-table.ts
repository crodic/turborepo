import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilesTable1771203054787 implements MigrationInterface {
  name = 'CreateFilesTable1771203054787';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "files" (
                "id" BIGSERIAL NOT NULL,
                "public_id" character varying NOT NULL,
                "folder" character varying,
                "original_name" character varying NOT NULL,
                "path" character varying NOT NULL,
                "hash" character varying NOT NULL,
                "mime" character varying NOT NULL,
                "size" integer NOT NULL,
                "width" integer,
                "height" integer,
                "duration" integer,
                "resource_type" character varying NOT NULL,
                "status" character varying NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_file_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_file_public_id" ON "files" ("public_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_file_public_id"
        `);
    await queryRunner.query(`
            DROP TABLE "files"
        `);
  }
}
