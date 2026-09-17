import { Global, Module } from '@nestjs/common';
import { CaslModule } from './casl/casl.module';

@Global()
@Module({
  imports: [CaslModule],
  providers: [],
  exports: [CaslModule],
})
export class SharedModule {}
