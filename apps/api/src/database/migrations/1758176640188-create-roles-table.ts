import { ALL_PERMISSIONS } from '@/utils/permissions.constant';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1758176640188 implements MigrationInterface {
  name = 'CreateRolesTable1758176640188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_permissions" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying NOT NULL,
        "group" character varying NOT NULL,
        "description" character varying,
        "key" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_permission_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_admin_permissions_key" ON "admin_permissions" ("key")
    `);

    for (const permission of ALL_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO "admin_permissions" ("name", "group", "description", "key")
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
      CREATE TABLE "admin_roles" (
          "id" BIGSERIAL NOT NULL,
          "name" character varying NOT NULL,
          "description" character varying,
          "is_system" boolean NOT NULL DEFAULT false,
          "deleted_at" TIMESTAMP WITH TIME ZONE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_admin_role_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_admin_roles_name" ON "admin_roles" ("name") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_role_permission" (
        "admin_role_id" bigint NOT NULL,
        "admin_permission_id" bigint NOT NULL,
        CONSTRAINT "PK_admin_role_permission" PRIMARY KEY ("admin_role_id", "admin_permission_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_role_permission_admin_role_id" ON "admin_role_permission" ("admin_role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_role_permission_admin_permission_id" ON "admin_role_permission" ("admin_permission_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_role_permission"
      ADD CONSTRAINT "FK_admin_role_permission_role"
      FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_role_permission"
      ADD CONSTRAINT "FK_admin_role_permission_permission"
      FOREIGN KEY ("admin_permission_id") REFERENCES "admin_permissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_role_permission" DROP CONSTRAINT "FK_admin_role_permission_permission"
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_role_permission" DROP CONSTRAINT "FK_admin_role_permission_role"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_admin_role_permission_admin_permission_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_admin_role_permission_admin_role_id"
    `);

    await queryRunner.query(`
      DROP TABLE "admin_role_permission"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_admin_roles_name"
    `);

    await queryRunner.query(`
      DROP TABLE "admin_roles"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_admin_permissions_key"
    `);

    await queryRunner.query(`
      DROP TABLE "admin_permissions"
    `);
  }
}
