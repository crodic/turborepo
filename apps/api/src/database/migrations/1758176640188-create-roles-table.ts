import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1758176640188 implements MigrationInterface {
  name = 'CreateRolesTable1758176640188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."roles_domain_enum" AS ENUM('client', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_domain_enum" AS ENUM('client', 'admin')`,
    );

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" BIGSERIAL NOT NULL,
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "domain" "public"."roles_domain_enum" NOT NULL DEFAULT 'client',
        "is_system" boolean NOT NULL DEFAULT false,
        "description" text,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_roles_domain" ON "roles" ("domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_roles_code" ON "roles" ("code")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_roles_code_domain_unique" ON "roles" ("code", "domain") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying NOT NULL,
        "group" character varying NOT NULL DEFAULT 'general',
        "description" text,
        "key" character varying NOT NULL,
        "action" character varying(50),
        "subject" character varying(50),
        "domain" "public"."permissions_domain_enum",
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permission_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_permissions_key" ON "permissions" ("key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_permissions_domain" ON "permissions" ("domain")`,
    );

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" bigint NOT NULL,
        "permission_id" bigint NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_domain_enum"`);
    await queryRunner.query(`DROP TYPE "public"."roles_domain_enum"`);
  }
}
