import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
  DirectorySource,
  DirectorySyncLog,
  DirectoryEntryFile,
  DirectoryTemplate,
  DirectoryEntryAudit,
  DirectoryStats,
} from './entities';

// Services
import {
  DirectoryService,
  EntryService,
  SearchService,
  ValidationService,
  AuditService,
} from './services';

// Controllers
import { DirectoriesController, EntriesController } from './controllers';

// Guards
import { DirectoryPermissionGuard } from './guards';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Directory,
      DirectoryField,
      DirectoryEntry,
      DirectorySource,
      DirectorySyncLog,
      DirectoryEntryFile,
      DirectoryTemplate,
      DirectoryEntryAudit,
      DirectoryStats,
    ]),
  ],
  controllers: [DirectoriesController, EntriesController],
  providers: [
    // Services
    DirectoryService,
    EntryService,
    SearchService,
    ValidationService,
    AuditService,
    // Guards
    DirectoryPermissionGuard,
  ],
  exports: [
    DirectoryService,
    EntryService,
    SearchService,
    ValidationService,
    AuditService,
  ],
})
export class DirectoriesV2Module {}
