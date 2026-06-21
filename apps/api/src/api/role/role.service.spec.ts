import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleResDto } from './dto/role.res.dto';
import { RoleEntity } from './entities/role.entity';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;
  const roleRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findOneByOrFail: jest.fn(),
    count: jest.fn(),
    softRemove: jest.fn(),
    create: jest.fn((data) => new RoleEntity(data)),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
    })),
  };
  const permissionRepository = {
    findBy: jest.fn(),
  };
  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,

        // Mock Repository
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: roleRepository,
        },
        {
          provide: getRepositoryToken(PermissionEntity),
          useValue: permissionRepository,
        },

        // Mock Cache Manager
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasRole', () => {
    it('returns the cached value when present', async () => {
      cacheManager.get.mockResolvedValue(false);

      await expect(service.hasRole()).resolves.toBe(false);

      expect(roleRepository.count).not.toHaveBeenCalled();
    });

    it('counts roles and caches the result on cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      roleRepository.count.mockResolvedValue(2);

      await expect(service.hasRole()).resolves.toBe(true);

      expect(cacheManager.set).toHaveBeenCalledWith(
        CacheKey.SYSTEM_HAS_ROLE,
        true,
        60000,
      );
    });
  });

  describe('create', () => {
    it('creates a role with resolved permissions', async () => {
      const permissions = [
        new PermissionEntity({ id: '1' as any, key: 'read:User' }),
        new PermissionEntity({ id: '2' as any, key: 'create:User' }),
      ];
      const savedRole = new RoleEntity({
        id: '10' as any,
        name: 'Manager',
        permissionEntities: permissions,
      });

      permissionRepository.findBy.mockResolvedValue(permissions);
      roleRepository.save.mockResolvedValue(savedRole);

      const result = await service.create({
        name: 'Manager',
        description: 'Can manage users',
        permissionIds: ['1', '2'],
      });

      expect(roleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Manager',
          isSystem: false,
          permissionEntities: permissions,
        }),
      );
      expect(instanceToPlain(result)).toEqual(
        expect.objectContaining({
          name: 'Manager',
          permissionIds: ['1', '2'],
          permissions: ['read:User', 'create:User'],
        }),
      );
    });

    it('throws when a permission id cannot be resolved', async () => {
      permissionRepository.findBy.mockResolvedValue([
        new PermissionEntity({ id: '1' as any }),
      ]);

      await expect(
        service.create({ name: 'Manager', permissionIds: ['1', '2'] }),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E002 },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('throws when creating a role with the reserved SUPER ADMIN name', async () => {
      await expect(
        service.create({ name: 'SUPER ADMIN', permissionIds: ['1'] }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'SUPER ADMIN is a reserved role name',
        },
      });

      expect(permissionRepository.findBy).not.toHaveBeenCalled();
      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('throws when assigning manage:all', async () => {
      permissionRepository.findBy.mockResolvedValue([
        new PermissionEntity({ id: '1' as any, key: 'manage:all' }),
      ]);

      await expect(
        service.create({ name: 'Super Admin', permissionIds: ['1'] }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'manage:all cannot be assigned to roles',
        },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns the updated role dto with permissions', async () => {
      const permissions = [
        new PermissionEntity({ id: '1' as any, key: 'read:User' }),
        new PermissionEntity({ id: '2' as any, key: 'create:User' }),
      ];
      const role = new RoleEntity({
        id: '10' as any,
        name: 'Manager',
        permissionEntities: [],
      });
      const savedRole = new RoleEntity({
        id: '10' as any,
        name: 'Admin',
        permissionEntities: permissions,
      });

      roleRepository.findOneOrFail.mockResolvedValue(role);
      permissionRepository.findBy.mockResolvedValue(permissions);
      roleRepository.save.mockResolvedValue(savedRole);

      const result = await service.update('10' as any, {
        name: 'Admin',
        permissionIds: ['1', '2'],
      });

      expect(result).toBeInstanceOf(RoleResDto);
      expect(instanceToPlain(result)).toEqual(
        expect.objectContaining({
          name: 'Admin',
          permissionIds: ['1', '2'],
          permissions: ['read:User', 'create:User'],
        }),
      );
    });

    it('does not update system roles', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({ id: '10' as any, name: 'System', isSystem: true }),
      );

      await expect(
        service.update('10' as any, {
          name: 'Updated System',
        }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'System roles cannot be updated or deleted',
        },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('does not update the SUPER ADMIN role by name', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({
          id: '10' as any,
          name: 'SUPER ADMIN',
          isSystem: false,
        }),
      );

      await expect(
        service.update('10' as any, {
          description: 'Updated description',
        }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'System roles cannot be updated or deleted',
        },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('does not rename a role to SUPER ADMIN', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({
          id: '10' as any,
          name: 'Manager',
          isSystem: false,
        }),
      );

      await expect(
        service.update('10' as any, {
          name: 'SUPER ADMIN',
        }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'SUPER ADMIN is a reserved role name',
        },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('throws when updating permissions to include manage:all', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({ id: '10' as any, name: 'Admin' }),
      );
      permissionRepository.findBy.mockResolvedValue([
        new PermissionEntity({ id: '1' as any, key: 'manage:all' }),
      ]);

      await expect(
        service.update('10' as any, {
          permissionIds: ['1'],
        }),
      ).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'manage:all cannot be assigned to roles',
        },
      });

      expect(roleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('does not remove system roles', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({ id: '1' as any, name: 'System', isSystem: true }),
      );

      await expect(service.remove('1' as any)).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'System roles cannot be updated or deleted',
        },
      });
      expect(roleRepository.softRemove).not.toHaveBeenCalled();
    });

    it('does not remove the SUPER ADMIN role by name', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({
          id: '1' as any,
          name: 'SUPER ADMIN',
          isSystem: false,
        }),
      );

      await expect(service.remove('1' as any)).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'System roles cannot be updated or deleted',
        },
      });
      expect(roleRepository.softRemove).not.toHaveBeenCalled();
    });

    it('does not remove roles assigned to admins', async () => {
      roleRepository.findOneOrFail.mockResolvedValue(
        new RoleEntity({
          id: '1' as any,
          name: 'Manager',
          isSystem: false,
          admins: [{ id: '10' as any }] as any,
        }),
      );

      await expect(service.remove('1' as any)).rejects.toMatchObject({
        response: {
          errorCode: ErrorCode.V000,
          message: 'Role cannot be deleted while assigned to admins',
        },
      });
      expect(roleRepository.softRemove).not.toHaveBeenCalled();
    });

    it('soft removes non-system roles', async () => {
      const role = new RoleEntity({
        id: '1' as any,
        name: 'Manager',
        isSystem: false,
        admins: [],
      });
      roleRepository.findOneOrFail.mockResolvedValue(role);

      await service.remove('1' as any);

      expect(roleRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['admins'],
      });
      expect(roleRepository.softRemove).toHaveBeenCalledWith(role);
    });
  });
});
