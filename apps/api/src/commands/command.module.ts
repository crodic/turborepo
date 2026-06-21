import { Global, Module } from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { NESTLENS_COMMAND_BUS } from 'nestlens';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: NESTLENS_COMMAND_BUS,
      useFactory: (commandBus: CommandBus) => commandBus,
      inject: [CommandBus],
    },
  ],
  exports: [NESTLENS_COMMAND_BUS],
})
export class CommandModule {}
