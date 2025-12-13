import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StockMovementService } from '../services/stock-movement.service';
import { CreateReceiptDto, CreateShipmentDto, CreateTransferDto } from '../dto/create-movement.dto';
import { MovementType } from '../entities/stock-movement.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('stock-movements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-movements')
export class StockMovementController {
  constructor(private readonly movementService: StockMovementService) {}

  @Post('receipt')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async createReceipt(@Body() dto: CreateReceiptDto) {
    return this.movementService.createReceipt(dto);
  }

  @Post('shipment')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.movementService.createShipment(dto);
  }

  @Post('transfer')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async createTransfer(@Body() dto: CreateTransferDto) {
    return this.movementService.createTransfer(dto);
  }

  @Get('history/:warehouseId')
  async getHistory(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query('product_id') productId?: string,
    @Query('movement_type') movementType?: MovementType,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.movementService.getMovementHistory(warehouseId, {
      product_id: productId,
      movement_type: movementType,
      start_date: startDate ? new Date(startDate) : undefined,
      end_date: endDate ? new Date(endDate) : undefined,
    });
  }
}
