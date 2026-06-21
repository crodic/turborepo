import {
  ADMIN_FULL_ACCESS,
  ALL_PERMISSIONS,
} from '@/utils/permissions.constant';
import { In, Repository } from 'typeorm';
import { PermissionEntity } from './entities/permission.entity';

export const FULL_ACCESS_PERMISSION_KEY = `${ADMIN_FULL_ACCESS.action}:${ADMIN_FULL_ACCESS.subject}`;

export const permissionCatalogRows = () =>
  ALL_PERMISSIONS.map((permission) => ({
    key: permission.key,
    group: permission.group,
    name: permission.name,
    description: permission.description,
  }));

export async function syncPermissions(
  permissionRepository: Repository<PermissionEntity>,
) {
  const catalogRows = permissionCatalogRows();
  const existingPermissions = await permissionRepository.findBy({
    key: In(catalogRows.map((permission) => permission.key)),
  });
  const existingPermissionByKey = new Map(
    existingPermissions.map((permission) => [permission.key, permission]),
  );

  for (const permission of catalogRows) {
    const existingPermission = existingPermissionByKey.get(permission.key);

    if (!existingPermission) {
      await permissionRepository.save(permissionRepository.create(permission));
      continue;
    }

    if (existingPermission.name !== permission.name) {
      await permissionRepository.update(
        { key: permission.key },
        { name: permission.name },
      );
    }
  }
}
