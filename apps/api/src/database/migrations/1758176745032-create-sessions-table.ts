import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1758176745032 implements MigrationInterface {
  name = 'CreateSessionsTable1758176745032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_domain_enum" AS ENUM('client', 'admin')`,
    );

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" BIGSERIAL NOT NULL,
        "user_id" bigint NOT NULL,
        "domain" "public"."sessions_domain_enum" NOT NULL DEFAULT 'client',
        "refresh_token_hash" character varying(255) NOT NULL,
        "ip_address" character varying(50),
        "user_agent" text,
        "device_info" character varying(255),
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "last_active_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_domain" ON "sessions" ("domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_user_id_is_revoked" ON "sessions" ("user_id", "is_revoked")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_domain_enum"`);
  }
}
