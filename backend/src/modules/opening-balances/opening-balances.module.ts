import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpeningBalancesService } from './opening-balances.service';
import { OpeningBalancesController } from './opening-balances.controller';
import { StockOpeningBalance } from './entities/opening-balance.entity';
import { WarehouseInventory } from '@/modules/inventory/entities/warehouse-inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockOpeningBalance, WarehouseInventory])],
  controllers: [OpeningBalancesController],
  providers: [OpeningBalancesService],
  exports: [OpeningBalancesService],
})
export class OpeningBalancesModule {}
