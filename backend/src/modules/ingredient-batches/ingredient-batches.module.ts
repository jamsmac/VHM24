import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngredientBatchesService } from './ingredient-batches.service';
import { IngredientBatchesController } from './ingredient-batches.controller';
import { IngredientBatch } from './entities/ingredient-batch.entity';

/**
 * Ingredient Batches Module
 *
 * Manages ingredient batch operations with FIFO (First-In-First-Out)
 * inventory tracking for ingredients in vending machines.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 *
 * Features:
 * - CRUD operations for ingredient batches
 * - FIFO deduction for inventory consumption
 * - Expiry date tracking and alerts
 * - Stock level monitoring
 * - Supplier tracking
 *
 * API Endpoints:
 * - GET    /ingredient-batches                    - List all batches
 * - GET    /ingredient-batches/:id                - Get batch by ID
 * - GET    /ingredient-batches/nomenclature/:id   - Get batches by nomenclature
 * - GET    /ingredient-batches/nomenclature/:id/stock - Get stock for nomenclature
 * - GET    /ingredient-batches/expiring           - Get expiring batches
 * - GET    /ingredient-batches/stock-summary      - Get stock summary
 * - POST   /ingredient-batches                    - Create batch
 * - PATCH  /ingredient-batches/:id                - Update batch
 * - POST   /ingredient-batches/deduct             - FIFO deduction
 * - POST   /ingredient-batches/check-expired      - Mark expired batches
 * - DELETE /ingredient-batches/:id                - Delete batch
 */
@Module({
  imports: [TypeOrmModule.forFeature([IngredientBatch])],
  controllers: [IngredientBatchesController],
  providers: [IngredientBatchesService],
  exports: [IngredientBatchesService, TypeOrmModule],
})
export class IngredientBatchesModule {}
