import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderKey } from './entities/ai-provider-key.entity';
import { AiProviderKeyService } from './services/ai-provider-key.service';
import { AiProviderKeyController } from './controllers/ai-provider-key.controller';

/**
 * Settings Module
 *
 * Manages application settings including:
 * - AI provider API keys
 * - (Future) Other system settings
 */
@Module({
  imports: [TypeOrmModule.forFeature([AiProviderKey])],
  controllers: [AiProviderKeyController],
  providers: [AiProviderKeyService],
  exports: [AiProviderKeyService],
})
export class SettingsModule {}
