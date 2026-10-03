import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PresenceCountsDto, PresenceSnapshotDto } from './dto/presence.dto';
import { PresenceService } from './presence.service';

@ApiTags('Presence')
@Controller({ path: 'presence', version: '1' })
@UseGuards(AdminAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('snapshot')
  @ApiAuth({
    type: PresenceSnapshotDto,
    summary: 'Get snapshot of online admins and users',
  })
  async getSnapshot(): Promise<PresenceSnapshotDto> {
    return this.presenceService.getSnapshot();
  }

  @Get('counts')
  @ApiAuth({
    type: PresenceCountsDto,
    summary: 'Get online user counts',
  })
  async getCounts(): Promise<PresenceCountsDto> {
    return this.presenceService.getCounts();
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin client reports presence heartbeat' })
  async heartbeat(@CurrentUser() user: AdminUserEntity): Promise<void> {
    await this.presenceService.touchUser({
      id: user.id,
      type: 'admin',
      email: user.email,
      fullName: user.fullName,
      avatar: (user.avatar as any)?.path ?? undefined,
    });
  }
}
