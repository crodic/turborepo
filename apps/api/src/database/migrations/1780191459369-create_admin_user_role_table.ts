import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUserRoleTable1780191459369 implements MigrationInterface {
  name = 'CreateAdminUserRoleTable1780191459369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "admin_user_role" (
                "admin_user_id" bigint NOT NULL,
                "admin_role_id" bigint NOT NULL,
                CONSTRAINT "PK_admin_user_role" PRIMARY KEY ("admin_user_id", "admin_role_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_admin_user_role_admin_user_id" ON "admin_user_role" ("admin_user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_admin_user_role_admin_role_id" ON "admin_user_role" ("admin_role_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role"
            ADD CONSTRAINT "FK_admin_user_role_admin_user" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role"
            ADD CONSTRAINT "FK_admin_user_role_admin_role" FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "admin_user_role" DROP CONSTRAINT "FK_admin_user_role_admin_role"
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role" DROP CONSTRAINT "FK_admin_user_role_admin_user"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_admin_user_role_admin_role_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_admin_user_role_admin_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "admin_user_role"
        `);
  }
}
