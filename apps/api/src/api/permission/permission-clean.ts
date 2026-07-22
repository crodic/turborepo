import { In, Not, Repository } from 'typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { permissionCatalogRows } from './permission-sync';

export async function cleanPermissions(
  permissionRepository: Repository<PermissionEntity>,
  force: boolean = false,
) {
  const catalogRows = permissionCatalogRows();
  const catalogKeys = catalogRows.map((permission) => permission.key);

  const orphanedPermissions = await permissionRepository.find({
    where: {
      key: Not(In(catalogKeys)),
    },
  });

  if (orphanedPermissions.length === 0) {
    console.info('No orphaned permissions found. Database is clean.');
    return;
  }

  console.warn(`Found ${orphanedPermissions.length} orphaned permissions:`);
  orphanedPermissions.forEach((p) => {
    console.warn(` - [${p.key}] ${p.name}`);
  });

  if (!force) {
    console.info(
      '\nRun with --force to permanently delete these permissions from the database.',
    );
    return;
  }

  const idsToDelete = orphanedPermissions.map((p) => p.id);
  await permissionRepository.delete(idsToDelete);

  console.info(
    `Successfully deleted ${orphanedPermissions.length} permissions.`,
  );
}
