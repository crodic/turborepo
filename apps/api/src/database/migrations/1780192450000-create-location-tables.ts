import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLocationTables1780192450000 implements MigrationInterface {
  name = 'CreateLocationTables1780192450000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Regions table
    await queryRunner.query(`
      CREATE TABLE "regions" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_regions_id" PRIMARY KEY ("id")
      )
    `);

    // 2. Countries table
    await queryRunner.query(`
      CREATE TABLE "countries" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "iso2" character varying(2),
        "iso3" character varying(3),
        "numeric_code" character varying(3),
        "phonecode" character varying(20),
        "capital" character varying(100),
        "currency" character varying(10),
        "currency_name" character varying(100),
        "currency_symbol" character varying(20),
        "tld" character varying(10),
        "native" character varying(255),
        "subregion" character varying(100),
        "latitude" double precision,
        "longitude" double precision,
        "region_id" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_countries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_countries_region_id" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_countries_iso2" ON "countries" ("iso2")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_countries_iso3" ON "countries" ("iso3")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_countries_region_id" ON "countries" ("region_id")`,
    );

    // 3. States table
    await queryRunner.query(`
      CREATE TABLE "states" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "country_id" bigint NOT NULL,
        "country_code" character varying(2),
        "iso2" character varying(10),
        "iso3166_2" character varying(10),
        "type" character varying(191),
        "latitude" double precision,
        "longitude" double precision,
        "timezone" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_states_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_states_country_id" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_states_country_id" ON "states" ("country_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_states_country_code" ON "states" ("country_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_states_country_iso2" ON "states" ("country_id", "iso2")`,
    );

    // 4. Cities table
    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" BIGSERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "state_id" bigint,
        "state_code" character varying(10),
        "country_id" bigint,
        "country_code" character varying(2),
        "code" character varying(10),
        "latitude" double precision,
        "longitude" double precision,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cities_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cities_state_id" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cities_country_id" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cities_state_id" ON "cities" ("state_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cities_country_id" ON "cities" ("country_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cities_country_state" ON "cities" ("country_id", "state_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cities_name" ON "cities" ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cities"`);
    await queryRunner.query(`DROP TABLE "states"`);
    await queryRunner.query(`DROP TABLE "countries"`);
    await queryRunner.query(`DROP TABLE "regions"`);
  }
}
