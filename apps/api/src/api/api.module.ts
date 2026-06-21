import { Module } from '@nestjs/common';
import { AdminUserModule } from './admin-user/admin-user.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CmsPageModule } from './cms-page/cms-page.module';
import { EmailModule } from './email/email.module';
import { FileModule } from './file/file.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { ImpersonateLogModule } from './impersonate-log/impersonate-log.module';
import { NotificationModule } from './notification/notification.module';
import { PermissionModule } from './permission/permission.module';
import { PresenceModule } from './presence/presence.module';
import { RoleModule } from './role/role.module';
import { SentryMonitoringModule } from './sentry-monitoring/sentry-monitoring.module';
import { SettingsModule } from './settings/settings.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    HealthModule,
    AuthModule,
    CmsPageModule,
    HomeModule,
    AuditLogModule,
    ImpersonateLogModule,
    PresenceModule,
    PermissionModule,
    RoleModule,
    AdminUserModule,
    SettingsModule,
    EmailModule,
    FileModule,
    SentryMonitoringModule,
    NotificationModule,
  ],
})
export class ApiModule {}
