import { ApiPublic } from '@/decorators/http.decorators';
import { Public } from '@/decorators/public.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateSystemSetupReqDto } from './dto/create-system-setup.req.dto';
import { HomeService } from './home.service';

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly homeService: HomeService) {}

  @Get('status')
  @Public()
  @ApiPublic({ summary: 'Initial Status' })
  initialStatus() {
    return this.homeService.initialStatus();
  }

  @Post()
  @Public()
  @ApiPublic({ summary: 'System Setup' })
  @ApiBody({ type: CreateSystemSetupReqDto })
  setup(@Body() dto: CreateSystemSetupReqDto) {
    return this.homeService.systemSetup(dto);
  }
}
