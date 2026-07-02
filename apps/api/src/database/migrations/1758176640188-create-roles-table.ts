import { ALL_PERMISSIONS } from '@/utils/permissions.constant';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1758176640188 implements MigrationInterface {
  name = 'CreateRolesTable1758176640188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying NOT NULL,
        "group" character varying NOT NULL,
        "description" character varying,
        "key" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permission_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_permissions_key" ON "permissions" ("key")
    `);

    for (const permission of ALL_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO "permissions" ("name", "group", "description", "key")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("key") DO NOTHING
        `,
        [
          permission.name,
          permission.group,
          permission.description,
          permission.key,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE "roles" (
          "id" BIGSERIAL NOT NULL,
          "name" character varying NOT NULL,
          "description" character varying,
          "is_system" boolean NOT NULL DEFAULT false,
          "deleted_at" TIMESTAMP WITH TIME ZONE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_role_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_roles_name" ON "roles" ("name") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permission" (
        "role_id" bigint NOT NULL,
        "permission_id" bigint NOT NULL,
        CONSTRAINT "PK_role_permission" PRIMARY KEY ("role_id", "permission_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permission_role_id" ON "role_permission" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permission_permission_id" ON "role_permission" ("permission_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permission"
      ADD CONSTRAINT "FK_role_permission_role"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permission"
      ADD CONSTRAINT "FK_role_permission_permission"
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "role_permission" DROP CONSTRAINT "FK_role_permission_permission"
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permission" DROP CONSTRAINT "FK_role_permission_role"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_role_permission_permission_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_role_permission_role_id"
    `);

    await queryRunner.query(`
      DROP TABLE "role_permission"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_roles_name"
    `);

    await queryRunner.query(`
      DROP TABLE "roles"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_permissions_key"
    `);

    await queryRunner.query(`
      DROP TABLE "permissions"
    `);
  }
}
