import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Warehouse } from './entities/warehouse.entity';
import { WarehouseZone } from './entities/warehouse-zone.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { StockTake } from './entities/stock-take.entity';

// Services
import { WarehouseService } from './services/warehouse.service';
import { StockMovementService } from './services/stock-movement.service';
import { InventoryBatchService } from './services/inventory-batch.service';
import { StockReservationService } from './services/stock-reservation.service';

// Controllers
import { WarehouseController } from './controllers/warehouse.controller';
import { StockMovementController } from './controllers/stock-movement.controller';
import { InventoryBatchController } from './controllers/inventory-batch.controller';
import { StockReservationController } from './controllers/stock-reservation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      WarehouseZone,
      StockMovement,
      InventoryBatch,
      StockReservation,
      StockTake,
    ]),
  ],
  controllers: [
    WarehouseController,
    StockMovementController,
    InventoryBatchController,
    StockReservationController,
  ],
  providers: [
    WarehouseService,
    StockMovementService,
    InventoryBatchService,
    StockReservationService,
  ],
  exports: [WarehouseService, StockMovementService, InventoryBatchService, StockReservationService],
})
export class WarehouseModule {}
