import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingEntity } from './entities/setting.entity';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(SettingEntity),
          useValue: mockRepo,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('returns a cached setting without querying the database', async () => {
      mockCache.get.mockResolvedValue('cached-value');

      await expect(service.get('site_name', 'fallback')).resolves.toBe(
        'cached-value',
      );

      expect(mockRepo.findOne).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('reads from the database and caches the value on cache miss', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue({ key: 'site_name', value: 'API' });

      await expect(service.get('site_name', 'fallback')).resolves.toBe('API');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { key: 'site_name' },
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        'app_settings.site_name',
        'API',
        3600,
      );
    });

    it('caches and returns the default value when no setting exists', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.get('missing', 'fallback')).resolves.toBe(
        'fallback',
      );

      expect(mockCache.set).toHaveBeenCalledWith(
        'app_settings.missing',
        'fallback',
        3600,
      );
    });
  });

  describe('set', () => {
    it('creates a new setting and invalidates the cache', async () => {
      const row = { key: 'site_name', value: 'API' };
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(row);

      await expect(service.set('site_name', 'API')).resolves.toBe(true);

      expect(mockRepo.create).toHaveBeenCalledWith({
        key: 'site_name',
        value: 'API',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(row);
      expect(mockCache.del).toHaveBeenCalledWith('app_settings.site_name');
    });

    it('updates an existing setting and invalidates the cache', async () => {
      const row = { key: 'site_name', value: 'Old' };
      mockRepo.findOne.mockResolvedValue(row);

      await expect(service.set('site_name', 'New')).resolves.toBe(true);

      expect(row.value).toBe('New');
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(row);
      expect(mockCache.del).toHaveBeenCalledWith('app_settings.site_name');
    });
  });
});
