import { Controller, Get, Put, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryBatchService } from '../services/inventory-batch.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('inventory-batches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-batches')
export class InventoryBatchController {
  constructor(private readonly batchService: InventoryBatchService) {}

  @Get()
  async findAll(
    @Query('warehouse_id') warehouseId?: string,
    @Query('product_id') productId?: string,
  ) {
    return this.batchService.findAll(warehouseId, productId);
  }

  @Get('product/:warehouseId/:productId')
  async getBatchesByProduct(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.batchService.getBatchesByProduct(warehouseId, productId);
  }

  @Get('expiring/:warehouseId')
  async getExpiringBatches(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query('days_threshold') daysThreshold?: number,
  ) {
    return this.batchService.getExpiringBatches(
      warehouseId,
      daysThreshold ? Number(daysThreshold) : 30,
    );
  }

  @Get('expired/:warehouseId')
  async getExpiredBatches(@Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.batchService.getExpiredBatches(warehouseId);
  }

  @Get('summary/:warehouseId')
  async getStockSummary(@Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.batchService.getStockSummary(warehouseId);
  }

  @Put(':id/quarantine')
  @Roles('ADMIN', 'MANAGER', 'Owner')
  async quarantineBatch(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string) {
    return this.batchService.quarantineBatch(id, reason);
  }

  @Put(':id/release')
  @Roles('ADMIN', 'MANAGER', 'Owner')
  async releaseFromQuarantine(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchService.releaseFromQuarantine(id);
  }
}
