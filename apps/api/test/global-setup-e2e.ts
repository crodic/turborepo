import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Client } from 'pg';

export default async function globalSetup() {
  config({
    path: resolve(process.cwd(), '.env.testing'),
    override: true,
    quiet: true,
  });

  const dbName = process.env.DATABASE_NAME || 'boilerplate_test';
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } catch (error: any) {
    console.warn(
      `Could not auto-create test database "${dbName}":`,
      error?.message,
    );
  } finally {
    await client.end().catch(() => {});
  }
}
