import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { RecipesModule } from '../recipes/recipes.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Machine]),
    InventoryModule, // For inventory deduction on sales
    RecipesModule, // For getting recipe ingredients
    IncidentsModule, // For creating incidents on inventory mismatches
    SecurityModule, // For audit logging
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
