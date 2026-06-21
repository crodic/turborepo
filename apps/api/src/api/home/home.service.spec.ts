import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminUserService } from '../admin-user/admin-user.service';
import { RoleService } from '../role/role.service';
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
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
