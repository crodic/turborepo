import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { NotificationResDto } from './dto/notification.res.dto';
import { NotificationUnreadCountResDto } from './dto/unread-count.res.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(AdminAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiAuth({
    type: NotificationResDto,
    summary: 'Get current admin notifications',
  })
  listMine(
    @CurrentUser('id') adminId: AutoIncrementID,
    @Query('limit') limit?: string,
  ): Promise<NotificationResDto[]> {
    return this.notificationService.listMine(adminId, Number(limit) || 20);
  }

  @Get('unread-count')
  @ApiAuth({
    type: NotificationUnreadCountResDto,
    summary: 'Get current admin unread notification count',
  })
  unreadCount(
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    return this.notificationService.getUnreadCount(adminId);
  }

  @Patch(':id/read')
  @ApiAuth({ type: NotificationResDto, summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: 'String' })
  markRead(
    @CurrentUser('id') adminId: AutoIncrementID,
    @Param('id') notificationId: AutoIncrementID,
  ): Promise<NotificationResDto> {
    return this.notificationService.markRead(adminId, notificationId);
  }

  @Delete(':id')
  @ApiAuth({
    type: NotificationUnreadCountResDto,
    summary: 'Delete current admin notification',
  })
  @ApiParam({ name: 'id', type: 'String' })
  deleteMine(
    @CurrentUser('id') adminId: AutoIncrementID,
    @Param('id') notificationId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    return this.notificationService.deleteMine(adminId, notificationId);
  }

  @Patch('read-all')
  @ApiAuth({
    type: NotificationUnreadCountResDto,
    summary: 'Mark all notifications as read',
  })
  markAllRead(
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    return this.notificationService.markAllRead(adminId);
  }
}
