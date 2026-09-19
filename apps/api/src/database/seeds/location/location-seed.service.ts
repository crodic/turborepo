import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationSeedService {
  private readonly logger = new Logger(LocationSeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async run(filterCountryCode?: string) {
    const dataDir = path.resolve(__dirname, '../../data/location');

    await this.seedRegions(dataDir);
    await this.seedCountries(dataDir, filterCountryCode);
    await this.seedStates(dataDir, filterCountryCode);
    await this.seedCities(dataDir, filterCountryCode);
  }

  private async seedRegions(dataDir: string) {
    const filePath = path.join(dataDir, 'regions.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Regions file not found at ${filePath}`);
      return;
    }

    const count = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM regions',
    );
    if (parseInt(count[0]?.count, 10) > 0) {
      this.logger.log('Regions already seeded. Skipping.');
      return;
    }

    this.logger.log('Seeding regions...');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const regions: any[] = JSON.parse(raw);

    for (const r of regions) {
      await this.dataSource.query(
        'INSERT INTO regions (id, name, created_at, updated_at) VALUES ($1, $2, now(), now()) ON CONFLICT (id) DO NOTHING',
        [r.id, r.name],
      );
    }

    await this.dataSource.query(
      `SELECT setval('regions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM regions))`,
    );
    this.logger.log(`Seeded ${regions.length} regions.`);
  }

  private async seedCountries(dataDir: string, filterCountryCode?: string) {
    const filePath = path.join(dataDir, 'countries.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Countries file not found at ${filePath}`);
      return;
    }

    const count = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM countries',
    );
    if (parseInt(count[0]?.count, 10) >= 250) {
      this.logger.log('Countries already seeded. Skipping.');
      return;
    }

    this.logger.log('Seeding countries...');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const countries: any[] = JSON.parse(raw);

    const batchSize = 100;
    let batch: any[] = [];

    for (const c of countries) {
      if (
        filterCountryCode &&
        c.iso2?.toUpperCase() !== filterCountryCode.toUpperCase()
      ) {
        continue;
      }

      batch.push(c);
      if (batch.length >= batchSize) {
        await this.insertCountriesBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await this.insertCountriesBatch(batch);
    }

    await this.dataSource.query(
      `SELECT setval('countries_id_seq', (SELECT COALESCE(MAX(id), 1) FROM countries))`,
    );
    this.logger.log('Countries seeded successfully.');
  }

  private async insertCountriesBatch(batch: any[]) {
    for (const c of batch) {
      await this.dataSource.query(
        `INSERT INTO countries (
          id, name, iso2, iso3, numeric_code, phonecode, capital, currency,
          currency_name, currency_symbol, tld, native, subregion, latitude, longitude,
          region_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now())
        ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.name,
          c.iso2 ?? null,
          c.iso3 ?? null,
          c.numeric_code ?? null,
          c.phonecode ?? null,
          c.capital ?? null,
          c.currency ?? null,
          c.currency_name ?? null,
          c.currency_symbol ?? null,
          c.tld ?? null,
          c.native ?? null,
          c.subregion ?? null,
          c.latitude ? parseFloat(c.latitude) : null,
          c.longitude ? parseFloat(c.longitude) : null,
          c.region_id ?? null,
        ],
      );
    }
  }

  private async seedStates(dataDir: string, filterCountryCode?: string) {
    const filePath = path.join(dataDir, 'states.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`States file not found at ${filePath}`);
      return;
    }

    const count = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM states',
    );
    if (parseInt(count[0]?.count, 10) >= 5000) {
      this.logger.log('States already seeded. Skipping.');
      return;
    }

    this.logger.log('Seeding states...');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const states: any[] = JSON.parse(raw);

    const batchSize = 500;
    let batch: any[] = [];

    for (const s of states) {
      if (
        filterCountryCode &&
        s.country_code?.toUpperCase() !== filterCountryCode.toUpperCase()
      ) {
        continue;
      }

      batch.push(s);
      if (batch.length >= batchSize) {
        await this.insertStatesBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await this.insertStatesBatch(batch);
    }

    await this.dataSource.query(
      `SELECT setval('states_id_seq', (SELECT COALESCE(MAX(id), 1) FROM states))`,
    );
    this.logger.log('States seeded successfully.');
  }

  private async insertStatesBatch(batch: any[]) {
    for (const s of batch) {
      await this.dataSource.query(
        `INSERT INTO states (
          id, name, country_id, country_code, iso2, iso3166_2, type, latitude, longitude, timezone, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.name,
          s.country_id,
          s.country_code ?? null,
          s.iso2 ?? null,
          s.iso3166_2 ?? null,
          s.type ?? null,
          s.latitude ? parseFloat(s.latitude) : null,
          s.longitude ? parseFloat(s.longitude) : null,
          s.timezone ?? null,
        ],
      );
    }
  }

  private async seedCities(dataDir: string, filterCountryCode?: string) {
    const filePath = path.join(dataDir, 'cities.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Cities file not found at ${filePath}`);
      return;
    }

    const count = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM cities',
    );
    const existingCount = parseInt(count[0]?.count, 10);
    if (!filterCountryCode && existingCount >= 150000) {
      this.logger.log('Cities already fully seeded. Skipping.');
      return;
    }

    this.logger.log(
      `Seeding cities (filter: ${filterCountryCode || 'ALL'})...`,
    );
    const raw = fs.readFileSync(filePath, 'utf-8');
    const cities: any[] = JSON.parse(raw);

    const batchSize = 1000;
    let batch: any[] = [];
    let seededCount = 0;

    for (const c of cities) {
      if (
        filterCountryCode &&
        c.country_code?.toUpperCase() !== filterCountryCode.toUpperCase()
      ) {
        continue;
      }

      batch.push(c);
      if (batch.length >= batchSize) {
        await this.insertCitiesBatch(batch);
        seededCount += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await this.insertCitiesBatch(batch);
      seededCount += batch.length;
    }

    await this.dataSource.query(
      `SELECT setval('cities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cities))`,
    );
    this.logger.log(`Seeded ${seededCount} cities.`);
  }

  private async insertCitiesBatch(batch: any[]) {
    if (batch.length === 0) return;

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    batch.forEach((c, index) => {
      const offset = index * 9;
      valuePlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, now(), now())`,
      );
      values.push(
        c.id,
        c.name,
        c.state_id ?? null,
        c.state_code ?? null,
        c.country_id ?? null,
        c.country_code ?? null,
        c.code ?? null,
        c.latitude ? parseFloat(c.latitude) : null,
        c.longitude ? parseFloat(c.longitude) : null,
      );
    });

    const query = `
      INSERT INTO cities (
        id, name, state_id, state_code, country_id, country_code, code, latitude, longitude, created_at, updated_at
      ) VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `;

    await this.dataSource.query(query, values);
  }
}
