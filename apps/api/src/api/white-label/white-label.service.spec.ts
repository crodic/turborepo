import { AutoIncrementID } from '@/common/types/common.type';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WhiteLabelEntity } from './entities/white-label.entity';
import { WhiteLabelService } from './white-label.service';

describe('WhiteLabelService', () => {
  let service: WhiteLabelService;
  let whiteLabelRepositoryValue: Partial<
    Record<keyof Repository<WhiteLabelEntity>, jest.Mock>
  >;
  let filesystemServiceMock: {
    put: jest.Mock;
    delete: jest.Mock;
  };
  let dataSourceMock: {
    createQueryRunner: jest.Mock;
  };

  const sampleStyles = {
    light: { primary: 'oklch(0.5 0.2 240)' },
    dark: { primary: 'oklch(0.6 0.2 240)' },
  };

  beforeAll(async () => {
    whiteLabelRepositoryValue = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    filesystemServiceMock = {
      put: jest.fn(),
      delete: jest.fn(),
    };

    dataSourceMock = {
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteLabelService,
        {
          provide: getRepositoryToken(WhiteLabelEntity),
          useValue: whiteLabelRepositoryValue,
        },
        {
          provide: FilesystemService,
          useValue: filesystemServiceMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<WhiteLabelService>(WhiteLabelService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveWhiteLabel', () => {
    it('returns active white label when found', async () => {
      const activeRecord = new WhiteLabelEntity({
        id: '1' as AutoIncrementID,
        name: 'Default Blue',
        slug: 'default-blue',
        target: EWhiteLabelTarget.ADMIN,
        isActive: true,
        styles: sampleStyles as any,
      });

      whiteLabelRepositoryValue.findOne.mockResolvedValue(activeRecord);

      const result = await service.getActiveWhiteLabel(EWhiteLabelTarget.ADMIN);

      expect(whiteLabelRepositoryValue.findOne).toHaveBeenCalledWith({
        where: {
          target: EWhiteLabelTarget.ADMIN,
          isActive: true,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          slug: 'default-blue',
          target: EWhiteLabelTarget.ADMIN,
        }),
      );
    });

    it('returns null when no active white label exists', async () => {
      whiteLabelRepositoryValue.findOne.mockResolvedValue(null);

      const result = await service.getActiveWhiteLabel(EWhiteLabelTarget.ADMIN);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('returns the found white label entity dto', async () => {
      const item = new WhiteLabelEntity({
        id: '1' as AutoIncrementID,
        name: 'Default Blue',
        slug: 'default-blue',
        target: EWhiteLabelTarget.ADMIN,
        isActive: true,
        styles: sampleStyles as any,
      });

      whiteLabelRepositoryValue.findOneOrFail.mockResolvedValue(item);

      const result = await service.findOne('1' as AutoIncrementID);

      expect(whiteLabelRepositoryValue.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '1' as AutoIncrementID },
      });
      expect(result.id).toBe('1');
    });
  });

  describe('remove', () => {
    it('soft removes the white label entity', async () => {
      const item = new WhiteLabelEntity({
        id: '1' as AutoIncrementID,
        name: 'To Delete',
        slug: 'to-delete',
        target: EWhiteLabelTarget.ADMIN,
        isActive: false,
        styles: sampleStyles as any,
      });

      whiteLabelRepositoryValue.findOneOrFail.mockResolvedValue(item);
      whiteLabelRepositoryValue.softRemove.mockResolvedValue(item);

      await service.remove('1' as AutoIncrementID);

      expect(whiteLabelRepositoryValue.softRemove).toHaveBeenCalledWith(item);
    });
  });
});
