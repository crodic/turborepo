import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AdminUserController } from './admin-user.controller';

@Module({
  imports: [UserModule],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
