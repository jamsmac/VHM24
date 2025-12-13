import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Supplier } from './entities/supplier.entity';
import { Material } from './entities/material.entity';
import { Request } from './entities/request.entity';
import { RequestItem } from './entities/request-item.entity';

// Services
import { SuppliersService } from './suppliers.service';
import { MaterialsService } from './materials.service';
import { RequestsService } from './requests.service';

// Controllers
import { SuppliersController } from './suppliers.controller';
import { MaterialsController } from './materials.controller';
import { RequestsController } from './requests.controller';

/**
 * Модуль управления заявками на материалы.
 *
 * Включает:
 * - Поставщики (suppliers)
 * - Каталог материалов (materials)
 * - Заявки на материалы (requests)
 *
 * Workflow заявки:
 * NEW → APPROVED → SENT → PARTIAL_DELIVERED → COMPLETED
 *   ↓       ↓
 * REJECTED  CANCELLED
 */
@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Material, Request, RequestItem])],
  controllers: [SuppliersController, MaterialsController, RequestsController],
  providers: [SuppliersService, MaterialsService, RequestsService],
  exports: [SuppliersService, MaterialsService, RequestsService],
})
export class RequestsModule {}
