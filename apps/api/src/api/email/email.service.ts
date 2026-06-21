import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { EEmailLogSource, EEmailLogStatus } from '@/constants/entity.enum';
import { JobName, QueueName } from '@/constants/job.constant';
import { MailService } from '@/mail/mail.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ILike, MoreThan, Repository } from 'typeorm';
import { CreateEmailReqDto } from './dto/create-email.req.dto';
import { EmailLogResDto } from './dto/email-log.res.dto';
import { EmailRecipientOptionResDto } from './dto/email-recipient-option.res.dto';
import { UpdateEmailReqDto } from './dto/update-email.req.dto';
import { EmailLogEntity } from './entities/email-log.entity';

const MAX_EMAILS_PER_WINDOW = 10;
const EMAIL_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECIPIENTS_PER_DAY = 100;
const MAX_RECIPIENTS_PER_EMAIL = 50;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: Repository<EmailLogEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    dto: CreateEmailReqDto,
    adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    this.validateSchedule(dto.scheduledAt);
    this.validateBody(dto.body);
    await this.enforceAntiSpam(adminId, dto);

    const emailLog = this.emailLogRepository.create({
      ...this.toEmailPayload(dto),
      source: EEmailLogSource.ADMIN,
      status: EEmailLogStatus.SCHEDULED,
      from: this.getDefaultFrom(),
      templateName: dto.templateName ?? 'admin-email',
      jobName: JobName.ADMIN_SEND_EMAIL,
      createdByAdminId: adminId,
    });

    await this.emailLogRepository.save(emailLog);
    await this.scheduleEmail(emailLog);

    return this.findMineOne(emailLog.id, adminId);
  }

  async findMine(
    query: PaginateQuery,
    adminId: AutoIncrementID,
  ): Promise<Paginated<EmailLogResDto>> {
    return this.findAll(query, { createdByAdminId: adminId });
  }

  async findAll(
    query: PaginateQuery,
    filter: Partial<EmailLogEntity> = {},
  ): Promise<Paginated<EmailLogResDto>> {
    const qb = this.emailLogRepository
      .createQueryBuilder('emailLog')
      .leftJoinAndSelect('emailLog.createdByAdmin', 'createdByAdmin');

    if (filter.createdByAdminId) {
      qb.andWhere('emailLog.createdByAdminId = :createdByAdminId', {
        createdByAdminId: filter.createdByAdminId,
      });
    }

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'createdAt', 'scheduledAt', 'sentAt', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.IN],
        source: [FilterOperator.IN],
        subject: [FilterOperator.ILIKE],
        createdByAdminId: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
        scheduledAt: [FilterOperator.GTE, FilterOperator.LTE],
        sentAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    return {
      ...result,
      data: plainToInstance(EmailLogResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<EmailLogResDto>;
  }

  async findMineOne(
    id: AutoIncrementID,
    adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id, createdByAdminId: adminId },
      relations: ['createdByAdmin'],
    });

    if (!emailLog) {
      throw new NotFoundException('Email not found');
    }

    return plainToInstance(EmailLogResDto, emailLog, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: AutoIncrementID): Promise<EmailLogResDto> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id },
      relations: ['createdByAdmin'],
    });

    if (!emailLog) {
      throw new NotFoundException('Email log not found');
    }

    return plainToInstance(EmailLogResDto, emailLog, {
      excludeExtraneousValues: true,
    });
  }

  async updateScheduled(
    id: AutoIncrementID,
    dto: UpdateEmailReqDto,
    adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    this.validateSchedule(dto.scheduledAt);
    this.validateBody(dto.body);
    const emailLog = await this.getEditableEmail(id, adminId);
    await this.removeDelayedJob(emailLog);

    Object.assign(emailLog, {
      ...this.toEmailPayload(dto),
      status: EEmailLogStatus.SCHEDULED,
      scheduledAt: dto.scheduledAt,
      queueJobId: null,
      errorMessage: null,
      failedAt: null,
      cancelledAt: null,
    });

    await this.emailLogRepository.save(emailLog);
    await this.scheduleEmail(emailLog);

    return this.findMineOne(id, adminId);
  }

  async cancelScheduled(
    id: AutoIncrementID,
    adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    const emailLog = await this.getEditableEmail(id, adminId);
    await this.removeDelayedJob(emailLog);

    emailLog.status = EEmailLogStatus.CANCELLED;
    emailLog.cancelledAt = new Date();
    emailLog.queueJobId = null;
    await this.emailLogRepository.save(emailLog);
    await this.notifyEmailStatus(
      emailLog,
      AdminNotificationType.EmailCancelled,
      'Scheduled email cancelled',
      `Your scheduled email "${emailLog.subject}" was cancelled.`,
    );

    return this.findMineOne(id, adminId);
  }

  async searchRecipients(
    search?: string,
  ): Promise<EmailRecipientOptionResDto[]> {
    const keyword = search?.trim() ?? '';
    const [admins, users] = await Promise.all([
      this.searchAdminRecipients(keyword),
      this.searchUserRecipients(keyword),
    ]);
    const recipientsByEmail = new Map<string, EmailRecipientOptionResDto>();

    [...admins, ...users].forEach((recipient) => {
      const email = recipient.email.toLowerCase();
      if (!recipientsByEmail.has(email)) {
        recipientsByEmail.set(email, {
          ...recipient,
          email,
        });
      }
    });

    return plainToInstance(
      EmailRecipientOptionResDto,
      [...recipientsByEmail.values()].slice(0, 20),
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async searchAdminRecipients(
    keyword: string,
  ): Promise<EmailRecipientOptionResDto[]> {
    const where = keyword
      ? [{ email: ILike(`%${keyword}%`) }, { fullName: ILike(`%${keyword}%`) }]
      : {};
    const admins = await this.adminUserRepository.find({
      where,
      order: { email: 'ASC' },
      take: 10,
    });

    return admins.map((admin) => ({
      id: String(admin.id),
      type: 'admin',
      name: admin.fullName,
      email: admin.email,
    }));
  }

  private async searchUserRecipients(
    keyword: string,
  ): Promise<EmailRecipientOptionResDto[]> {
    const where = keyword
      ? [{ email: ILike(`%${keyword}%`) }, { fullName: ILike(`%${keyword}%`) }]
      : {};
    const users = await this.userRepository.find({
      where,
      order: { email: 'ASC' },
      take: 10,
    });

    return users.map((user) => ({
      id: String(user.id),
      type: 'user',
      name: user.fullName,
      email: user.email,
    }));
  }

  private async getEditableEmail(
    id: AutoIncrementID,
    adminId: AutoIncrementID,
  ): Promise<EmailLogEntity> {
    const emailLog = await this.emailLogRepository.findOneBy({
      id,
      createdByAdminId: adminId,
    });

    if (!emailLog) {
      throw new NotFoundException('Email not found');
    }

    if (emailLog.status !== EEmailLogStatus.SCHEDULED) {
      throw new ForbiddenException('Only scheduled emails can be changed');
    }

    return emailLog;
  }

  private async scheduleEmail(emailLog: EmailLogEntity): Promise<void> {
    const delay = emailLog.scheduledAt
      ? Math.max(emailLog.scheduledAt.getTime() - Date.now(), 0)
      : 0;
    const job = await this.emailQueue.add(
      JobName.ADMIN_SEND_EMAIL,
      { emailLogId: emailLog.id },
      { delay },
    );

    emailLog.queueJobId = job.id;
    await this.emailLogRepository.save(emailLog);
  }

  private async removeDelayedJob(emailLog: EmailLogEntity): Promise<void> {
    if (!emailLog.queueJobId) {
      return;
    }

    const job = await this.emailQueue.getJob(emailLog.queueJobId);
    if (job) {
      await job.remove();
    }
  }

  private validateSchedule(scheduledAt?: Date): void {
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }
  }

  private async enforceAntiSpam(
    adminId: AutoIncrementID,
    dto: CreateEmailReqDto,
  ): Promise<void> {
    const recipientCount = this.countRecipients(dto);
    if (recipientCount > MAX_RECIPIENTS_PER_EMAIL) {
      throw new BadRequestException(
        `Email can have at most ${MAX_RECIPIENTS_PER_EMAIL} recipients`,
      );
    }

    const windowStart = new Date(Date.now() - EMAIL_WINDOW_MS);
    const recentCount = await this.emailLogRepository.count({
      where: {
        source: EEmailLogSource.ADMIN,
        createdByAdminId: adminId,
        createdAt: MoreThan(windowStart),
      },
    });

    if (recentCount >= MAX_EMAILS_PER_WINDOW) {
      throw new HttpException(
        'Email send rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayEmails = await this.emailLogRepository.find({
      where: {
        source: EEmailLogSource.ADMIN,
        createdByAdminId: adminId,
        createdAt: MoreThan(dayStart),
      },
      select: ['to', 'cc', 'bcc'],
    });
    const todayRecipientCount = todayEmails.reduce(
      (total, email) =>
        total +
        (email.to?.length ?? 0) +
        (email.cc?.length ?? 0) +
        (email.bcc?.length ?? 0),
      0,
    );

    if (todayRecipientCount + recipientCount > MAX_RECIPIENTS_PER_DAY) {
      throw new HttpException(
        'Daily email recipient limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private toEmailPayload(dto: CreateEmailReqDto) {
    const recipients = this.normalizeRecipients(dto);

    return {
      to: recipients.to,
      cc: recipients.cc,
      bcc: recipients.bcc,
      subject: dto.subject,
      body: dto.body,
      renderedBody: this.mailService.renderAdminEmail({
        subject: dto.subject,
        body: dto.body,
      }),
      scheduledAt: dto.scheduledAt,
    };
  }

  private normalizeRecipients(dto: CreateEmailReqDto): {
    to: string[];
    cc?: string[];
    bcc?: string[];
  } {
    const to = this.uniqueEmails(dto.to) ?? [];
    const toSet = new Set(to);
    const cc = (this.uniqueEmails(dto.cc) ?? []).filter(
      (email) => !toSet.has(email),
    );
    const ccSet = new Set([...to, ...cc]);
    const bcc = (this.uniqueEmails(dto.bcc) ?? []).filter(
      (email) => !ccSet.has(email),
    );

    return {
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
    };
  }

  private uniqueEmails(emails?: string[]): string[] | undefined {
    if (!emails?.length) {
      return undefined;
    }

    return [...new Set(emails.map((email) => email.toLowerCase()))];
  }

  private countRecipients(dto: CreateEmailReqDto): number {
    const recipients = this.normalizeRecipients(dto);

    return (
      recipients.to.length +
      (recipients.cc?.length ?? 0) +
      (recipients.bcc?.length ?? 0)
    );
  }

  private validateBody(body: string): void {
    const text = body
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (!text) {
      throw new BadRequestException('Email body is required');
    }
  }

  private getDefaultFrom(): string {
    const name = this.configService.get('mail.defaultName', { infer: true });
    const email = this.configService.get('mail.defaultEmail', { infer: true });

    return name ? `"${name}" <${email}>` : email;
  }

  private async notifyEmailStatus(
    emailLog: EmailLogEntity,
    type: AdminNotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    if (!emailLog.createdByAdminId) {
      return;
    }

    try {
      await this.notificationService.createForAdmin({
        adminId: emailLog.createdByAdminId,
        type,
        title,
        message,
        data: {
          emailLogId: emailLog.id,
          subject: emailLog.subject,
          status: emailLog.status,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create email notification: ${error}`);
    }
  }
}
