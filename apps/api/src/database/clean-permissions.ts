import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { cleanPermissions } from '@/api/permission/permission-clean';
import 'reflect-metadata';
import { AppDataSource } from './data-source';

async function run() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  await AppDataSource.initialize();

  try {
    await cleanPermissions(
      AppDataSource.getRepository(PermissionEntity),
      force,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void run().catch((error) => {
  console.error('Failed to clean permissions.', error);
  process.exit(1);
});
