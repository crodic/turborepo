import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFileFoldersTable1780192550000 implements MigrationInterface {
  name = 'CreateFileFoldersTable1780192550000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "file_folders" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_folder_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_file_folder_name" ON "file_folders" ("name")
    `);

    await queryRunner.query(`
      INSERT INTO "file_folders" ("name")
      SELECT DISTINCT "folder" FROM "files"
      WHERE "folder" IS NOT NULL AND "folder" <> ''
      ON CONFLICT ("name") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "files"
      ADD CONSTRAINT "FK_files_folder_name"
      FOREIGN KEY ("folder") REFERENCES "file_folders"("name")
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "files" DROP CONSTRAINT "FK_files_folder_name"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."UQ_file_folder_name"
    `);
    await queryRunner.query(`
      DROP TABLE "file_folders"
    `);
  }
}
