/**
 * AI Assistant Module
 *
 * Provides AI-powered tools for:
 * - External API analysis and integration generation
 * - Documentation generation
 * - Code generation for new modules
 * - Code fix suggestions
 * - Interactive chat assistance
 *
 * @module AiAssistantModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './services/ai-assistant.service';
import { IntegrationProposal } from './entities/integration-proposal.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationProposal]),
    SettingsModule, // For AiProviderKeyService
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
