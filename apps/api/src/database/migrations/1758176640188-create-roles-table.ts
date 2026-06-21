import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1758176640188 implements MigrationInterface {
  name = 'CreateRolesTable1758176640188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
          "id" BIGSERIAL NOT NULL,
          "name" character varying NOT NULL,
          "description" character varying,
          "permissions" jsonb NOT NULL DEFAULT '[]',
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
      ALTER TABLE "admin_users"
      ADD CONSTRAINT "FK_admin_user_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_roles_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_users" DROP CONSTRAINT "FK_admin_user_role"
    `);

    await queryRunner.query(`
      DROP TABLE "roles"
    `);
  }
}
