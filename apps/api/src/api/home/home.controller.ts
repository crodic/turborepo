import { ApiPublic } from '@/decorators/http.decorators';
import { Public } from '@/decorators/public.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CreateSystemSetupReqDto } from './dto/create-system-setup.req.dto';
import { HomeService } from './home.service';

@Controller('/')
@UseGuards(AdminAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @Public()
  @ApiPublic({ summary: 'Home' })
  home() {
    return 'Welcome to the API';
  }

  @Get('/setup/status')
  @Public()
  @ApiPublic({ summary: 'Initial Status' })
  initialStatus() {
    return this.homeService.initialStatus();
  }

  @Post('/setup')
  @Public()
  @ApiPublic({ summary: 'System Setup' })
  @ApiBody({ type: CreateSystemSetupReqDto })
  setup(@Body() dto: CreateSystemSetupReqDto) {
    return this.homeService.systemSetup(dto);
  }
}
