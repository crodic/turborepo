import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

let cachedVersion: string | undefined;

export function getPackageVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const candidatePaths = [
    join(process.cwd(), '../../package.json'),
    join(process.cwd(), 'package.json'),
    resolve(__dirname, '../../../../package.json'),
    resolve(__dirname, '../../../package.json'),
  ];

  for (const filePath of candidatePaths) {
    if (existsSync(filePath)) {
      try {
        const pkg = JSON.parse(readFileSync(filePath, 'utf8')) as {
          version?: string;
        };
        if (pkg.version) {
          cachedVersion = pkg.version;
          return cachedVersion;
        }
      } catch {
        // continue trying next candidate
      }
    }
  }

  cachedVersion = '1.0.0';
  return cachedVersion;
}
