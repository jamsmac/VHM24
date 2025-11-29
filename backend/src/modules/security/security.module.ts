import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AuditLog } from './entities/audit-log.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { TwoFactorAuth } from './entities/two-factor-auth.entity';
import { SessionLog } from './entities/session-log.entity';
import { DataEncryption } from './entities/data-encryption.entity';
import { AccessControlLog } from './entities/access-control.entity';

// Services
import { AuditLogService } from './services/audit-log.service';
import { SecurityEventService } from './services/security-event.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { SessionLogService } from './services/session-log.service';
import { EncryptionService } from './services/encryption.service';

// Controllers
import { AuditLogController } from './controllers/audit-log.controller';
import { SecurityEventController } from './controllers/security-event.controller';
import { TwoFactorAuthController } from './controllers/two-factor-auth.controller';
import { SessionLogController } from './controllers/session-log.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      SecurityEvent,
      TwoFactorAuth,
      SessionLog,
      DataEncryption,
      AccessControlLog,
    ]),
  ],
  controllers: [
    AuditLogController,
    SecurityEventController,
    TwoFactorAuthController,
    SessionLogController,
  ],
  providers: [
    AuditLogService,
    SecurityEventService,
    TwoFactorAuthService,
    SessionLogService,
    EncryptionService,
  ],
  exports: [
    AuditLogService,
    SecurityEventService,
    TwoFactorAuthService,
    SessionLogService,
    EncryptionService,
  ],
})
export class SecurityModule {}
