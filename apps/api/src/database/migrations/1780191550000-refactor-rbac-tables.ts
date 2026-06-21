import { ALL_PERMISSIONS } from '@/utils/permissions.constant';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorRbacTables1780191550000 implements MigrationInterface {
  name = 'RefactorRbacTables1780191550000';

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
      ALTER TABLE "roles"
      ADD "is_system" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET "is_system" = true
      WHERE "name" = 'SUPER ADMIN'
        OR "permissions" ? 'manage:all'
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
      INSERT INTO "role_permission" ("role_id", "permission_id")
      SELECT DISTINCT r."id", p."id"
      FROM "roles" r
      CROSS JOIN LATERAL jsonb_array_elements_text(r."permissions") permission_key("key")
      INNER JOIN "permissions" p ON p."key" = permission_key."key"
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "admin_user_role" ("admin_user_id", "role_id")
      SELECT "id", "role_id"
      FROM "admin_users"
      WHERE "role_id" IS NOT NULL
      ON CONFLICT DO NOTHING
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

    await queryRunner.query(`
      ALTER TABLE "admin_users" DROP CONSTRAINT IF EXISTS "FK_admin_user_role"
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users" DROP COLUMN "role_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles" DROP COLUMN "permissions"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD "permissions" jsonb NOT NULL DEFAULT '[]'
    `);

    await queryRunner.query(`
      UPDATE "roles" r
      SET "permissions" = permissions_by_role."permissions"
      FROM (
        SELECT rp."role_id", jsonb_agg(p."key" ORDER BY p."key") AS "permissions"
        FROM "role_permission" rp
        INNER JOIN "permissions" p ON p."id" = rp."permission_id"
        GROUP BY rp."role_id"
      ) permissions_by_role
      WHERE permissions_by_role."role_id" = r."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD "role_id" bigint
    `);

    await queryRunner.query(`
      UPDATE "admin_users" au
      SET "role_id" = roles_by_admin."role_id"
      FROM (
        SELECT DISTINCT ON ("admin_user_id") "admin_user_id", "role_id"
        FROM "admin_user_role"
        ORDER BY "admin_user_id", "role_id"
      ) roles_by_admin
      WHERE roles_by_admin."admin_user_id" = au."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ALTER COLUMN "role_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD CONSTRAINT "FK_admin_user_role"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "roles" DROP COLUMN "is_system"
    `);

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
      DROP INDEX "public"."UQ_permissions_key"
    `);

    await queryRunner.query(`
      DROP TABLE "permissions"
    `);
  }
}
