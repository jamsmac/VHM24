import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryService } from './inventory.service';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { OperatorInventory } from './entities/operator-inventory.entity';
import { MachineInventory } from './entities/machine-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import {
  AddToWarehouseDto,
  RemoveFromWarehouseDto,
  UpdateWarehouseInventoryDto,
} from './dto/warehouse-inventory.dto';
import {
  TransferWarehouseToOperatorDto,
  TransferOperatorToWarehouseDto,
  TransferOperatorToMachineDto,
  TransferMachineToOperatorDto,
} from './dto/transfer-inventory.dto';
import {
  UpdateMachineInventoryDto,
  RecordSaleDto,
  AdjustInventoryDto,
} from './dto/machine-inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============================================================================
  // WAREHOUSE INVENTORY ENDPOINTS
  // ============================================================================

  @Get('warehouse')
  @ApiOperation({ summary: 'Получить весь инвентарь на складе' })
  @ApiResponse({
    status: 200,
    description: 'Список инвентаря склада',
    type: [WarehouseInventory],
  })
  getWarehouseInventory(): Promise<WarehouseInventory[]> {
    return this.inventoryService.getWarehouseInventory();
  }

  @Get('warehouse/low-stock')
  @ApiOperation({ summary: 'Получить товары с низким уровнем запаса на складе' })
  @ApiResponse({
    status: 200,
    description: 'Список товаров с низким запасом',
    type: [WarehouseInventory],
  })
  getWarehouseLowStock(): Promise<WarehouseInventory[]> {
    return this.inventoryService.getWarehouseLowStock();
  }

  @Get('warehouse/:nomenclatureId')
  @ApiOperation({ summary: 'Получить инвентарь конкретного товара на складе' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 200,
    description: 'Инвентарь товара',
    type: WarehouseInventory,
  })
  getWarehouseInventoryByNomenclature(
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
  ): Promise<WarehouseInventory> {
    return this.inventoryService.getWarehouseInventoryByNomenclature(nomenclatureId);
  }

  @Post('warehouse/add')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Добавить товар на склад (поступление)' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно добавлен',
    type: WarehouseInventory,
  })
  addToWarehouse(
    @Body() dto: AddToWarehouseDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<WarehouseInventory> {
    const userId = req.user.id;
    return this.inventoryService.addToWarehouse(dto, userId);
  }

  @Post('warehouse/remove')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Списать товар со склада' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно списан',
    type: WarehouseInventory,
  })
  removeFromWarehouse(
    @Body() dto: RemoveFromWarehouseDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<WarehouseInventory> {
    const userId = req.user.id;
    return this.inventoryService.removeFromWarehouse(dto, userId);
  }

  @Patch('warehouse/:nomenclatureId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить настройки складского инвентаря' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 200,
    description: 'Настройки обновлены',
    type: WarehouseInventory,
  })
  updateWarehouseInventory(
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
    @Body() dto: UpdateWarehouseInventoryDto,
  ): Promise<WarehouseInventory> {
    return this.inventoryService.updateWarehouseInventory(nomenclatureId, dto);
  }

  // ============================================================================
  // OPERATOR INVENTORY ENDPOINTS
  // ============================================================================

  @Get('operator/:operatorId')
  @ApiOperation({ summary: 'Получить инвентарь оператора' })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'Инвентарь оператора',
    type: [OperatorInventory],
  })
  getOperatorInventory(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
  ): Promise<OperatorInventory[]> {
    return this.inventoryService.getOperatorInventory(operatorId);
  }

  @Get('operator/:operatorId/:nomenclatureId')
  @ApiOperation({
    summary: 'Получить инвентарь конкретного товара у оператора',
  })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 200,
    description: 'Инвентарь товара',
    type: OperatorInventory,
  })
  getOperatorInventoryByNomenclature(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
  ): Promise<OperatorInventory> {
    return this.inventoryService.getOperatorInventoryByNomenclature(operatorId, nomenclatureId);
  }

  // ============================================================================
  // MACHINE INVENTORY ENDPOINTS
  // ============================================================================

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Получить инвентарь аппарата' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Инвентарь аппарата',
    type: [MachineInventory],
  })
  getMachineInventory(
    @Param('machineId', ParseUUIDPipe) machineId: string,
  ): Promise<MachineInventory[]> {
    return this.inventoryService.getMachineInventory(machineId);
  }

  @Get('machine/:machineId/:nomenclatureId')
  @ApiOperation({ summary: 'Получить инвентарь конкретного товара в аппарате' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 200,
    description: 'Инвентарь товара',
    type: MachineInventory,
  })
  getMachineInventoryByNomenclature(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
  ): Promise<MachineInventory> {
    return this.inventoryService.getMachineInventoryByNomenclature(machineId, nomenclatureId);
  }

  @Get('machines/low-stock')
  @ApiOperation({
    summary: 'Получить аппараты с низким уровнем запаса товаров',
  })
  @ApiResponse({
    status: 200,
    description: 'Список товаров с низким запасом в аппаратах',
    type: [MachineInventory],
  })
  getMachinesLowStock(): Promise<MachineInventory[]> {
    return this.inventoryService.getMachinesLowStock();
  }

  @Patch('machine/:machineId/:nomenclatureId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить настройки инвентаря аппарата' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 200,
    description: 'Настройки обновлены',
    type: MachineInventory,
  })
  updateMachineInventory(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
    @Body() dto: UpdateMachineInventoryDto,
  ): Promise<MachineInventory> {
    return this.inventoryService.updateMachineInventory(machineId, nomenclatureId, dto);
  }

  @Post('machine/:machineId/:nomenclatureId/adjust')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Корректировка инвентаря (инвентаризация)',
  })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiParam({ name: 'nomenclatureId', description: 'UUID товара' })
  @ApiResponse({
    status: 201,
    description: 'Инвентарь скорректирован',
    type: MachineInventory,
  })
  adjustMachineInventory(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Param('nomenclatureId', ParseUUIDPipe) nomenclatureId: string,
    @Body() dto: AdjustInventoryDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<MachineInventory> {
    const userId = req.user.id;
    return this.inventoryService.adjustMachineInventory(machineId, nomenclatureId, dto, userId);
  }

  // ============================================================================
  // TRANSFER ENDPOINTS
  // ============================================================================

  @Post('transfer/warehouse-to-operator')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Выдать товар оператору со склада' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно выдан',
  })
  transferWarehouseToOperator(
    @Body() dto: TransferWarehouseToOperatorDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.inventoryService.transferWarehouseToOperator(dto, userId);
  }

  @Post('transfer/operator-to-warehouse')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Вернуть товар на склад от оператора' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно возвращен',
  })
  transferOperatorToWarehouse(
    @Body() dto: TransferOperatorToWarehouseDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.inventoryService.transferOperatorToWarehouse(dto, userId);
  }

  @Post('transfer/operator-to-machine')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Пополнить аппарат (обычно вызывается автоматически при завершении задачи)',
  })
  @ApiResponse({
    status: 201,
    description: 'Аппарат успешно пополнен',
  })
  transferOperatorToMachine(
    @Body() dto: TransferOperatorToMachineDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.inventoryService.transferOperatorToMachine(dto, userId);
  }

  @Post('transfer/machine-to-operator')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Изъять товар из аппарата (брак, просрочка)' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно изъят',
  })
  transferMachineToOperator(
    @Body() dto: TransferMachineToOperatorDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.inventoryService.transferMachineToOperator(dto, userId);
  }

  @Post('sale')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Зарегистрировать продажу (расход ингредиента)',
  })
  @ApiResponse({
    status: 201,
    description: 'Продажа зарегистрирована',
    type: MachineInventory,
  })
  recordSale(
    @Body() dto: RecordSaleDto,
    @Req() req: ExpressRequest & { user: { id: string } },
  ): Promise<MachineInventory> {
    const userId = req.user.id;
    return this.inventoryService.recordSale(dto, userId);
  }

  // ============================================================================
  // MOVEMENTS ENDPOINTS
  // ============================================================================

  @Get('movements')
  @ApiOperation({ summary: 'Получить историю движений инвентаря' })
  @ApiQuery({
    name: 'movementType',
    required: false,
    enum: MovementType,
    description: 'Фильтр по типу движения',
  })
  @ApiQuery({
    name: 'nomenclatureId',
    required: false,
    type: String,
    description: 'Фильтр по товару',
  })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiQuery({
    name: 'operatorId',
    required: false,
    type: String,
    description: 'Фильтр по оператору',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата',
  })
  @ApiResponse({
    status: 200,
    description: 'История движений',
    type: [InventoryMovement],
  })
  getMovements(
    @Query('movementType') movementType?: MovementType,
    @Query('nomenclatureId') nomenclatureId?: string,
    @Query('machineId') machineId?: string,
    @Query('operatorId') operatorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<InventoryMovement[]> {
    return this.inventoryService.getMovements(
      movementType,
      nomenclatureId,
      machineId,
      operatorId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get('movements/stats')
  @ApiOperation({ summary: 'Получить статистику движений' })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика движений',
  })
  getMovementStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.inventoryService.getMovementStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  // ============================================================================
  // RESERVATIONS ENDPOINTS
  // ============================================================================

  @Get('reservations/active')
  @ApiOperation({
    summary: 'Получить все активные резервации инвентаря',
  })
  @ApiResponse({
    status: 200,
    description: 'Список активных резерваций',
  })
  getActiveReservations() {
    return this.inventoryService.getActiveReservations();
  }

  @Get('reservations/task/:taskId')
  @ApiOperation({
    summary: 'Получить резервации для конкретной задачи',
  })
  @ApiParam({ name: 'taskId', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Резервации задачи',
  })
  getReservationsByTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.inventoryService.getReservationsByTask(taskId);
  }

  @Get('reservations/operator/:operatorId')
  @ApiOperation({
    summary: 'Получить резервации оператора',
  })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'Резервации оператора',
  })
  getReservationsByOperator(@Param('operatorId', ParseUUIDPipe) operatorId: string) {
    return this.inventoryService.getReservationsByOperator(operatorId);
  }
}
