import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { RequestLogService } from './request-log.service';

@ApiTags('System')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller({ path: 'system/request-logs', version: '1' })
export class RequestLogController {
  constructor(private readonly requestLogService: RequestLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated request logs' })
  async getLogs(@Paginate() query: PaginateQuery) {
    return this.requestLogService.findAll(query);
  }

  @Get('map')
  @ApiOperation({
    summary: 'Get request logs with valid coordinates for map visualization',
  })
  async getMapLogs() {
    return this.requestLogService.getMapLogs();
  }
}
