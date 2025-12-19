import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineAccess } from './entities/machine-access.entity';
import { AccessTemplate } from './entities/access-template.entity';
import { AccessTemplateRow } from './entities/access-template-row.entity';
import { Machine } from '../machines/entities/machine.entity';
import { User } from '../users/entities/user.entity';
import { MachineAccessService } from './machine-access.service';
import { MachineAccessImportService } from './machine-access-import.service';
import { MachineAccessController } from './machine-access.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MachineAccess,
      AccessTemplate,
      AccessTemplateRow,
      Machine,
      User,
    ]),
  ],
  controllers: [MachineAccessController],
  providers: [MachineAccessService, MachineAccessImportService],
  exports: [MachineAccessService],
})
export class MachineAccessModule {}
