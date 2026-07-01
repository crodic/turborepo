import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import { NotificationService } from '@/api/notification/notification.service';
import { MailService } from '@/mail/mail.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailQueueService } from './email-queue.service';

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let mailServiceValue: Partial<Record<keyof MailService, jest.Mock>>;
  let emailLogRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeAll(async () => {
    mailServiceValue = {
      sendAdminEmailVerification: jest.fn(),
      sendAdminEmailForgotPassword: jest.fn(),
      sendAdminSuspiciousLogin: jest.fn(),
      sendUserEmailVerification: jest.fn(),
      sendUserEmailForgotPassword: jest.fn(),
      sendAdminEmail: jest.fn(),
      renderAdminEmailVerification: jest.fn(),
      renderAdminEmailForgotPassword: jest.fn(),
      renderAdminSuspiciousLogin: jest.fn(),
      renderUserEmailVerification: jest.fn(),
      renderUserEmailForgotPassword: jest.fn(),
      renderAdminEmail: jest.fn(),
    };
    emailLogRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        {
          provide: MailService,
          useValue: mailServiceValue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'mail.defaultName') return 'Crodic';
              if (key === 'mail.defaultEmail') return 'noreply@example.com';

              return undefined;
            }),
          },
        },
        {
          provide: getRepositoryToken(EmailLogEntity),
          useValue: emailLogRepository,
        },
        {
          provide: NotificationService,
          useValue: {
            createForAdmin: jest.fn(),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailQueueService>(EmailQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs the full rendered verification email body', async () => {
    mailServiceValue.renderUserEmailVerification.mockReturnValue(
      '<html>Verify account</html>',
    );
    mailServiceValue.sendUserEmailVerification.mockResolvedValue(
      '<html>Verify account</html>',
    );

    await service.sendUserEmailVerification({
      email: 'admin@example.com',
      token: 'verify-token',
    });

    expect(emailLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '<html>Verify account</html>',
        renderedBody: '<html>Verify account</html>',
      }),
    );
    expect(emailLogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        renderedBody: '<html>Verify account</html>',
      }),
    );
  });

  it('logs and sends suspicious admin login alerts', async () => {
    mailServiceValue.renderAdminSuspiciousLogin.mockReturnValue(
      '<html>Suspicious login</html>',
    );
    mailServiceValue.sendAdminSuspiciousLogin.mockResolvedValue(
      '<html>Suspicious login</html>',
    );

    await service.sendAdminSuspiciousLogin({
      email: 'admin@example.com',
      loginAt: '2026-06-30T08:00:00.000Z',
      ipAddress: '10.0.0.2',
      userAgent: 'Firefox',
      reasons: ['new_ip_address', 'new_device'],
    });

    expect(emailLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Unusual admin sign-in detected',
        jobName: 'admin-suspicious-login',
        templateName: 'admin-suspicious-login',
        body: '<html>Suspicious login</html>',
        renderedBody: '<html>Suspicious login</html>',
      }),
    );
    expect(mailServiceValue.sendAdminSuspiciousLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        renderedHtml: '<html>Suspicious login</html>',
      }),
    );
    expect(emailLogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        renderedBody: '<html>Suspicious login</html>',
      }),
    );
  });
});
