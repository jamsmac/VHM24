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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MaintenanceService } from '../services/maintenance.service';
import { ComponentMaintenance, MaintenanceType } from '../entities/component-maintenance.entity';
import { CreateMaintenanceDto, MaintenanceFiltersDto } from '../dto/maintenance.dto';

@ApiTags('Equipment - Maintenance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Создать запись обслуживания' })
  @ApiResponse({
    status: 201,
    description: 'Запись обслуживания создана',
    type: ComponentMaintenance,
  })
  create(@Body() dto: CreateMaintenanceDto): Promise<ComponentMaintenance> {
    return this.maintenanceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить историю обслуживания с фильтрацией' })
  @ApiQuery({ name: 'component_id', required: false })
  @ApiQuery({ name: 'maintenance_type', enum: MaintenanceType, required: false })
  @ApiQuery({ name: 'from_date', type: String, required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to_date', type: String, required: false, example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: 'История обслуживания',
    type: [ComponentMaintenance],
  })
  findAll(
    @Query('component_id') component_id?: string,
    @Query('maintenance_type') maintenance_type?: MaintenanceType,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ): Promise<ComponentMaintenance[]> {
    const filters: MaintenanceFiltersDto = {
      component_id,
      maintenance_type,
      from_date,
      to_date,
    };
    return this.maintenanceService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику обслуживания' })
  @ApiQuery({ name: 'componentId', required: false })
  @ApiQuery({ name: 'fromDate', type: String, required: false })
  @ApiQuery({ name: 'toDate', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Статистика обслуживания' })
  getStats(
    @Query('componentId') componentId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.maintenanceService.getStats(componentId, fromDate, toDate);
  }

  @Get('component/:componentId')
  @ApiOperation({ summary: 'Получить историю обслуживания компонента' })
  @ApiParam({ name: 'componentId', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'История обслуживания компонента',
    type: [ComponentMaintenance],
  })
  getComponentHistory(
    @Param('componentId', ParseUUIDPipe) componentId: string,
  ): Promise<ComponentMaintenance[]> {
    return this.maintenanceService.getComponentHistory(componentId);
  }

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Получить историю обслуживания аппарата' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiQuery({ name: 'maintenanceType', enum: MaintenanceType, required: false })
  @ApiResponse({
    status: 200,
    description: 'История обслуживания аппарата',
    type: [ComponentMaintenance],
  })
  getMachineHistory(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Query('maintenanceType') maintenanceType?: MaintenanceType,
  ): Promise<ComponentMaintenance[]> {
    return this.maintenanceService.getMachineMaintenanceHistory(machineId, maintenanceType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить запись обслуживания по ID' })
  @ApiParam({ name: 'id', description: 'UUID записи обслуживания' })
  @ApiResponse({
    status: 200,
    description: 'Данные обслуживания',
    type: ComponentMaintenance,
  })
  @ApiResponse({ status: 404, description: 'Запись обслуживания не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ComponentMaintenance> {
    return this.maintenanceService.findOne(id);
  }
}
