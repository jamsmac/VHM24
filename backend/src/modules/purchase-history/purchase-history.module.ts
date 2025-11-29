import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseHistoryService } from './purchase-history.service';
import { PurchaseHistoryController } from './purchase-history.controller';
import { PurchaseHistory } from './entities/purchase-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseHistory])],
  controllers: [PurchaseHistoryController],
  providers: [PurchaseHistoryService],
  exports: [PurchaseHistoryService],
})
export class PurchaseHistoryModule {}
