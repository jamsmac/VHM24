import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ReconciliationRun } from './entities/reconciliation-run.entity';
import { ReconciliationMismatch } from './entities/reconciliation-mismatch.entity';

// Services
import { ReconciliationService } from './reconciliation.service';

// Controllers
import { ReconciliationController } from './reconciliation.controller';

/**
 * Модуль сверки платежей.
 *
 * Позволяет сверять данные из различных источников:
 * - HW.xlsx (экспорт с автоматов)
 * - Sales Report (отчёт VendHub)
 * - Фискальные чеки
 * - Платёжные системы (Payme, Click, Uzum)
 *
 * Алгоритм сопоставления использует:
 * - Временное окно (configurable, default: 5 сек)
 * - Допуск по сумме (configurable, default: 100 сум)
 * - Score качества (0-6)
 */
@Module({
  imports: [TypeOrmModule.forFeature([ReconciliationRun, ReconciliationMismatch])],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
