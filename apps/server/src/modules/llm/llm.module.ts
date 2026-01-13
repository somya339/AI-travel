import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VectorModule } from '../vector/vector.module';


@Module({
  imports: [ConfigModule, VectorModule],
  controllers: [LlmController],
  providers: [
    ConfigService,
    LlmService,
  ],
})
export class LlmModule {}
