import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('warehouses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  async findAll() {
    return this.warehouseService.findAll();
  }

  @Get('active')
  async getActiveWarehouses() {
    return this.warehouseService.getActiveWarehouses();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouseService.findOne(id);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.warehouseService.findByCode(code);
  }

  @Get(':id/utilization')
  async getUtilization(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouseService.getWarehouseUtilization(id);
  }

  @Get(':id/zones')
  async getZones(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouseService.getZones(id);
  }
}
