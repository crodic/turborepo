import { Global, Module } from '@nestjs/common';
import { CaslModule } from './casl/casl.module';

@Global()
@Module({
  imports: [CaslModule],
  exports: [CaslModule],
})
export class LibsModule {}
