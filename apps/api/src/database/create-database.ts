import 'dotenv/config';
import { Client, ClientConfig } from 'pg';

const maintenanceDatabase = process.env.DATABASE_MAINTENANCE_NAME ?? 'postgres';

const getSslConfig = (): ClientConfig['ssl'] => {
  if (process.env.DATABASE_SSL_ENABLED !== 'true') {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
    ca: process.env.DATABASE_CA || undefined,
    key: process.env.DATABASE_KEY || undefined,
    cert: process.env.DATABASE_CERT || undefined,
  };
};

const quoteIdentifier = (value: string): string => {
  return `"${value.replace(/"/g, '""')}"`;
};

const getClientConfig = (): {
  databaseName: string;
  clientConfig: ClientConfig;
} => {
  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseName = decodeURIComponent(
      databaseUrl.pathname.replace(/^\//, ''),
    );

    if (!databaseName) {
      throw new Error('DATABASE_URL must include a database name');
    }

    databaseUrl.pathname = `/${maintenanceDatabase}`;

    return {
      databaseName,
      clientConfig: {
        connectionString: databaseUrl.toString(),
        ssl: getSslConfig(),
      },
    };
  }

  if (!process.env.DATABASE_NAME) {
    throw new Error('DATABASE_NAME is required');
  }

  return {
    databaseName: process.env.DATABASE_NAME,
    clientConfig: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT, 10)
        : 5432,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: maintenanceDatabase,
      ssl: getSslConfig(),
    },
  };
};

const createDatabase = async (): Promise<void> => {
  const { databaseName, clientConfig } = getClientConfig();
  const client = new Client(clientConfig);

  await client.connect();

  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (result.rowCount && result.rowCount > 0) {
      console.info(`Database "${databaseName}" already exists.`);
      return;
    }

    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.info(`Database "${databaseName}" has been created.`);
  } finally {
    await client.end();
  }
};

void createDatabase().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
