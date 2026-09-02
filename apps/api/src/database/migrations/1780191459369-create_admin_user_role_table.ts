import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUserRoleTable1780191459369 implements MigrationInterface {
  name = 'CreateAdminUserRoleTable1780191459369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" bigint NOT NULL,
        "role_id" bigint NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_user_id" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_role_id" ON "user_roles" ("role_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_roles"`);
  }
}
