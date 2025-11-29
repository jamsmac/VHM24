import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Counterparty } from './entities/counterparty.entity';
import { Contract } from './entities/contract.entity';
import { CommissionCalculation } from './entities/commission-calculation.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CounterpartyService } from './services/counterparty.service';
import { ContractService } from './services/contract.service';
import { CommissionService } from './services/commission.service';
import { RevenueAggregationService } from './services/revenue-aggregation.service';
import { CommissionSchedulerService } from './services/commission-scheduler.service';
import { CounterpartyController } from './counterparty.controller';
import { ContractController } from './contract.controller';
import { CommissionController } from './controllers/commission.controller';
import { CommissionCalculationProcessor } from './jobs/commission-calculation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Counterparty,
      Contract,
      CommissionCalculation,
      Transaction, // Phase 3: For revenue aggregation
    ]),
    // Phase 3: BullMQ queue for commission calculations
    BullModule.registerQueue({
      name: 'commission-calculations',
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: 100, // Keep last 100 successful jobs
        removeOnFail: 200, // Keep last 200 failed jobs for debugging
      },
    }),
  ],
  controllers: [CounterpartyController, ContractController, CommissionController],
  providers: [
    CounterpartyService,
    ContractService,
    CommissionService,
    RevenueAggregationService,
    CommissionSchedulerService,
    CommissionCalculationProcessor, // Phase 3: Background job processor
  ],
  exports: [
    CounterpartyService,
    ContractService,
    CommissionService,
    RevenueAggregationService,
    CommissionSchedulerService,
  ],
})
export class CounterpartyModule {}
