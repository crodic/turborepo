import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from './entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  const auditLogRepository = {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: auditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns an audit log dto when found', async () => {
      const auditLog = {
        id: '1',
        action: 'create',
        entity: 'User',
        entityId: '42',
        userId: '7',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
      };

      auditLogRepository.findOneBy.mockResolvedValue(auditLog);

      const result = await service.findOne('1' as any);

      expect(auditLogRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });

    it('throws not found when the audit log does not exist', async () => {
      auditLogRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing' as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('purgeAuditLogsOlderThan7Days', () => {
    it('deletes logs older than seven days', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-06-19T12:00:00.000Z').getTime());

      await service.purgeAuditLogsOlderThan7Days();

      expect(auditLogRepository.delete).toHaveBeenCalledWith({
        timestamp: LessThan(new Date('2026-06-12T12:00:00.000Z')),
      });
    });
  });
});
