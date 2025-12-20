import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryDifferencesController } from './inventory-differences.controller';
import { InventoryAdjustmentsController } from './inventory-adjustments.controller';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import { InventoryActualCount } from './entities/inventory-actual-count.entity';
import { InventoryDifferenceThreshold } from './entities/inventory-difference-threshold.entity';
import { InventoryAdjustment } from './entities/inventory-adjustment.entity';
// Refactored core services
import { WarehouseInventoryService } from './services/warehouse-inventory.service';
import { OperatorInventoryService } from './services/operator-inventory.service';
import { MachineInventoryService } from './services/machine-inventory.service';
import { InventoryTransferService } from './services/inventory-transfer.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
// Sprint 4 services
import { InventoryCalculationService } from './services/inventory-calculation.service';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryDifferenceService } from './services/inventory-difference.service';
import { InventoryThresholdActionsService } from './services/inventory-threshold-actions.service';
import { InventoryExportService } from './services/inventory-export.service';
import { InventoryPdfService } from './services/inventory-pdf.service';
import { InventoryAdjustmentService } from './services/inventory-adjustment.service';
import { InventoryReportPresetsService } from './services/inventory-report-presets.service';
import { InventoryReportPresetsController } from './controllers/inventory-report-presets.controller';
import { InventoryThresholdsController } from './controllers/inventory-thresholds.controller';
import { InventoryReportPreset } from './entities/inventory-report-preset.entity';
import { InventoryConsumptionCalculatorService } from './services/inventory-consumption-calculator.service';
import { InventoryThresholdService } from './services/inventory-threshold.service';
import { StockOpeningBalance } from '../opening-balances/entities/opening-balance.entity';
import { PurchaseHistory } from '../purchase-history/entities/purchase-history.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { RecipeSnapshot } from '../recipes/entities/recipe-snapshot.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { IncidentsModule } from '../incidents/incidents.module';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Existing entities
      WarehouseInventory,
      OperatorInventory,
      MachineInventory,
      InventoryMovement,
      InventoryReservation,
      // Sprint 4: New entities for calculations and differences
      InventoryActualCount,
      InventoryDifferenceThreshold,
      InventoryAdjustment,
      // Sprint 4: REQ-ANL-04 - Report presets
      InventoryReportPreset,
      // Dependencies from other modules
      StockOpeningBalance,
      PurchaseHistory,
      Transaction,
      RecipeSnapshot,
      Recipe,
    ]),
    // Sprint 4 Phase 2: Integration with other modules for automatic actions
    IncidentsModule,
    forwardRef(() => TasksModule),
    NotificationsModule,
    UsersModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [
    InventoryController,
    InventoryCountsController,
    InventoryDifferencesController,
    InventoryAdjustmentsController,
    InventoryReportPresetsController,
    InventoryThresholdsController,
  ],
  providers: [
    // Core inventory services (refactored)
    InventoryService,
    WarehouseInventoryService,
    OperatorInventoryService,
    MachineInventoryService,
    InventoryTransferService,
    InventoryMovementService,
    InventoryReservationService,
    // Sprint 4 services
    InventoryCalculationService,
    InventoryConsumptionCalculatorService,
    InventoryCountService,
    InventoryDifferenceService,
    InventoryThresholdActionsService,
    InventoryThresholdService,
    InventoryExportService,
    InventoryPdfService,
    InventoryAdjustmentService,
    InventoryReportPresetsService,
  ],
  exports: [
    // Core inventory services (refactored)
    InventoryService,
    WarehouseInventoryService,
    OperatorInventoryService,
    MachineInventoryService,
    InventoryTransferService,
    InventoryMovementService,
    InventoryReservationService,
    // Sprint 4 services
    InventoryCalculationService,
    InventoryConsumptionCalculatorService,
    InventoryCountService,
    InventoryDifferenceService,
    InventoryThresholdActionsService,
    InventoryThresholdService,
    InventoryExportService,
    InventoryPdfService,
    InventoryAdjustmentService,
    InventoryReportPresetsService,
  ],
})
export class InventoryModule {}
