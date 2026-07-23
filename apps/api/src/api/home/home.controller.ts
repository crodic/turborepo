import { ApiPublic } from '@/decorators/http.decorators';
import { Public } from '@/decorators/public.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
