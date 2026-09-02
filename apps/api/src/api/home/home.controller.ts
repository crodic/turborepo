import { ApiPublic } from '@/decorators/http.decorators';
import { Public } from '@/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('/')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @Public()
  @ApiPublic({ summary: 'Home' })
  home() {
    return 'Welcome to the API';
  }
}
