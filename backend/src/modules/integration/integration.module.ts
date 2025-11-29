import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Integration } from './entities/integration.entity';
import { IntegrationLog } from './entities/integration-log.entity';
import { Webhook } from './entities/webhook.entity';
import { SyncJob } from './entities/sync-job.entity';
import { ApiKey } from './entities/api-key.entity';

// Services
import { IntegrationService } from './services/integration.service';
import { IntegrationLogService } from './services/integration-log.service';
import { WebhookService } from './services/webhook.service';
import { SyncJobService } from './services/sync-job.service';

// Controllers
import { IntegrationController } from './controllers/integration.controller';
import { IntegrationLogController } from './controllers/integration-log.controller';
import { WebhookController } from './controllers/webhook.controller';
import { SyncJobController } from './controllers/sync-job.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, IntegrationLog, Webhook, SyncJob, ApiKey])],
  controllers: [
    IntegrationController,
    IntegrationLogController,
    WebhookController,
    SyncJobController,
  ],
  providers: [IntegrationService, IntegrationLogService, WebhookService, SyncJobService],
  exports: [IntegrationService, IntegrationLogService, WebhookService, SyncJobService],
})
export class IntegrationModule {}
