import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context) {
    const request = context.switchToHttp().getRequest();

    return {
      accessType: 'offline',
      state: request.query?.state,
    };
  }
}
