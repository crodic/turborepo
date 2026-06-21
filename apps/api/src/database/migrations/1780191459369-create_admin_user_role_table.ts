import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUserRoleTable1780191459369 implements MigrationInterface {
  name = 'CreateAdminUserRoleTable1780191459369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "admin_user_role" (
                "admin_user_id" bigint NOT NULL,
                "role_id" bigint NOT NULL,
                CONSTRAINT "PK_1e3f1cfc72dcaf25053a8fd77be" PRIMARY KEY ("admin_user_id", "role_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_df8c115670cc92552bf5d3f36e" ON "admin_user_role" ("admin_user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2755b4303706dda68d9fdbe2c9" ON "admin_user_role" ("role_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role"
            ADD CONSTRAINT "FK_df8c115670cc92552bf5d3f36e6" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role"
            ADD CONSTRAINT "FK_2755b4303706dda68d9fdbe2c97" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "admin_user_role" DROP CONSTRAINT "FK_2755b4303706dda68d9fdbe2c97"
        `);
    await queryRunner.query(`
            ALTER TABLE "admin_user_role" DROP CONSTRAINT "FK_df8c115670cc92552bf5d3f36e6"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2755b4303706dda68d9fdbe2c9"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_df8c115670cc92552bf5d3f36e"
        `);
    await queryRunner.query(`
            DROP TABLE "admin_user_role"
        `);
  }
}
