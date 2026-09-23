import { CmsPageSeedService } from '@/database/seeds/cms-page/cms-page-seed.service';
import { LocationSeedService } from '@/database/seeds/location/location-seed.service';
import { SettingSeedService } from '@/database/seeds/setting/setting-seed.service';
import { WhiteLabelSeedService } from '@/database/seeds/white-label/white-label-seed.service';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminUserService } from '../admin-user/admin-user.service';
import { RoleService } from '../role/role.service';
import { WhiteLabelService } from '../white-label/white-label.service';
import { HomeService } from './home.service';

describe('HomeService', () => {
  let service: HomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,

        // Mock DataSource
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => cb({})),
          },
        },

        // Mock AdminUserService
        {
          provide: AdminUserService,
          useValue: {
            hasAdmin: jest.fn(),
            createWithManager: jest.fn(),
          },
        },

        // Mock RoleService
        {
          provide: RoleService,
          useValue: {
            hasRole: jest.fn(),
            createWithManager: jest.fn(),
          },
        },

        // Mock WhiteLabelService
        {
          provide: WhiteLabelService,
          useValue: {
            getWhiteLabel: jest.fn(),
          },
        },

        // Mock SettingSeedService
        {
          provide: SettingSeedService,
          useValue: {
            run: jest.fn(),
          },
        },

        // Mock WhiteLabelSeedService
        {
          provide: WhiteLabelSeedService,
          useValue: {
            run: jest.fn(),
          },
        },

        // Mock CmsPageSeedService
        {
          provide: CmsPageSeedService,
          useValue: {
            run: jest.fn(),
          },
        },

        // Mock LocationSeedService
        {
          provide: LocationSeedService,
          useValue: {
            run: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
