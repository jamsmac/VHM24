import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { ReportsCacheInterceptor } from './interceptors/cache.interceptor';
import { NetworkSummaryService } from './services/network-summary.service';
import { ProfitLossService } from './services/profit-loss.service';
import { CashFlowService } from './services/cash-flow.service';
import { ExcelExportService } from './services/excel-export.service';
import { MachinePerformanceService } from './services/machine-performance.service';
import { LocationPerformanceService } from './services/location-performance.service';
import { ProductSalesService } from './services/product-sales.service';
import { CollectionsSummaryService } from './services/collections-summary.service';
import { OperatorPerformanceReportService } from './services/operator-performance-report.service';
import { TaskExecutionStatsService } from './services/task-execution-stats.service';
import { WarehouseInventoryReportService } from './services/warehouse-inventory-report.service';
import { DepreciationReportService } from './services/depreciation-report.service';
import { ExpiryTrackingReportService } from './services/expiry-tracking-report.service';
import { IncidentsStatsService } from './services/incidents-stats.service';
import { ComplaintsStatsService } from './services/complaints-stats.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { ManagerDashboardService } from './services/manager-dashboard.service';
import { OperatorDashboardService } from './services/operator-dashboard.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Task } from '../tasks/entities/task.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Complaint } from '../complaints/entities/complaint.entity';
import { Machine } from '../machines/entities/machine.entity';
// import { FinancialOperation } from '../financial-operations/entities/financial-operation.entity'; // Module not implemented yet
import { Location } from '../locations/entities/location.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { User } from '../users/entities/user.entity';
import { OperatorRating } from '../operator-ratings/entities/operator-rating.entity';
import { EquipmentComponent } from '../equipment/entities/equipment-component.entity'; // Was: Equipment
import { Warehouse } from '../warehouse/entities/warehouse.entity';
import { WarehouseInventory } from '../inventory/entities/warehouse-inventory.entity';
import { MachineInventory } from '../inventory/entities/machine-inventory.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { InventoryBatch } from '../warehouse/entities/inventory-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Task,
      Incident,
      Complaint,
      Machine,
      // FinancialOperation, // Module not implemented yet
      Location,
      Nomenclature,
      User,
      OperatorRating,
      EquipmentComponent, // Was: Equipment
      Warehouse,
      WarehouseInventory,
      MachineInventory,
      InventoryMovement,
      InventoryBatch,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    PdfGeneratorService,
    NetworkSummaryService,
    ProfitLossService,
    CashFlowService,
    ExcelExportService,
    MachinePerformanceService,
    LocationPerformanceService,
    ProductSalesService,
    CollectionsSummaryService,
    OperatorPerformanceReportService,
    TaskExecutionStatsService,
    WarehouseInventoryReportService,
    DepreciationReportService,
    ExpiryTrackingReportService,
    IncidentsStatsService,
    ComplaintsStatsService,
    AdminDashboardService,
    ManagerDashboardService,
    OperatorDashboardService,
    ReportsCacheInterceptor,
    Reflector,
  ],
  exports: [
    ReportsService,
    PdfGeneratorService,
    NetworkSummaryService,
    ProfitLossService,
    CashFlowService,
    ExcelExportService,
    MachinePerformanceService,
    LocationPerformanceService,
    ProductSalesService,
    CollectionsSummaryService,
    OperatorPerformanceReportService,
    TaskExecutionStatsService,
    WarehouseInventoryReportService,
    DepreciationReportService,
    ExpiryTrackingReportService,
    IncidentsStatsService,
    ComplaintsStatsService,
    AdminDashboardService,
    ManagerDashboardService,
    OperatorDashboardService,
  ],
})
export class ReportsModule {}
