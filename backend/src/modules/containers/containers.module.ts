import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContainersService } from './containers.service';
import { ContainersController } from './containers.controller';
import { Container } from './entities/container.entity';

/**
 * Containers Module
 *
 * Manages container (hopper/bunker) operations for vending machines.
 * Containers store ingredients like coffee beans, sugar, milk powder, etc.
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 *
 * Features:
 * - CRUD operations for containers
 * - Container refill tracking
 * - Low level alerts and monitoring
 * - Statistics by machine
 *
 * API Endpoints:
 * - GET    /containers                      - List all containers
 * - GET    /containers/:id                  - Get container by ID
 * - GET    /containers/machine/:machineId   - Get containers by machine
 * - POST   /containers                      - Create container
 * - PATCH  /containers/:id                  - Update container
 * - POST   /containers/:id/refill           - Refill container
 * - DELETE /containers/:id                  - Delete container
 * - GET    /containers/machine/:machineId/low-levels  - Check low levels
 * - GET    /containers/machine/:machineId/stats       - Get statistics
 * - GET    /containers/low-levels           - Check all low levels
 * - GET    /containers/nomenclature/:id     - Get by nomenclature
 */
@Module({
  imports: [TypeOrmModule.forFeature([Container])],
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}
