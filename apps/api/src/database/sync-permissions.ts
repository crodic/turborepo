import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import 'reflect-metadata';
import { AppDataSource } from './data-source';

async function run() {
  await AppDataSource.initialize();

  try {
    await syncPermissions(AppDataSource.getRepository(PermissionEntity));
    console.info('Permissions synced successfully.');
  } finally {
    await AppDataSource.destroy();
  }
}

void run().catch((error) => {
  console.error('Failed to sync permissions.', error);
  process.exit(1);
});
