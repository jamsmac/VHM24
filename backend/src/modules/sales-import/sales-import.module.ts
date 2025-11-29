import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SalesImportService } from './sales-import.service';
import { SalesImportController } from './sales-import.controller';
import { SalesImportProcessor } from './sales-import.processor';
import { SalesImport } from './entities/sales-import.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesImport, Transaction, Machine, Nomenclature]),
    BullModule.registerQueue({
      name: 'sales-import',
    }),
    InventoryModule,
  ],
  controllers: [SalesImportController],
  providers: [SalesImportService, SalesImportProcessor],
  exports: [SalesImportService],
})
export class SalesImportModule {}
