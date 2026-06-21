import { HttpModule, HttpService } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { NESTLENS_HTTP_CLIENT } from 'nestlens';

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [
    {
      provide: NESTLENS_HTTP_CLIENT,
      useFactory: (httpService: HttpService) => httpService.axiosRef,
      inject: [HttpService],
    },
  ],
  exports: [NESTLENS_HTTP_CLIENT],
})
export class HttpClientModule {}
