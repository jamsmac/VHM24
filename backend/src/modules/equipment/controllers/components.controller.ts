import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
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
import { ComponentsService } from '../services/components.service';
import { ComponentMovementsService } from '../services/component-movements.service';
import {
  EquipmentComponent,
  ComponentType,
  ComponentStatus,
  ComponentLocationType,
} from '../entities/equipment-component.entity';
import { CreateComponentDto, UpdateComponentDto, ReplaceComponentDto } from '../dto/component.dto';
import { MoveComponentDto } from '../dto/move-component.dto';
import { InstallComponentDto } from '../dto/install-component.dto';
import { RemoveComponentDto } from '../dto/remove-component.dto';
import { ComponentMovement, MovementType } from '../entities/component-movement.entity';

@ApiTags('Equipment - Components')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment/components')
export class ComponentsController {
  constructor(
    private readonly componentsService: ComponentsService,
    private readonly movementsService: ComponentMovementsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Создать новый компонент оборудования' })
  @ApiResponse({
    status: 201,
    description: 'Компонент создан',
    type: EquipmentComponent,
  })
  create(@Body() dto: CreateComponentDto): Promise<EquipmentComponent> {
    return this.componentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список компонентов' })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiQuery({ name: 'componentType', enum: ComponentType, required: false })
  @ApiQuery({ name: 'status', enum: ComponentStatus, required: false })
  @ApiResponse({
    status: 200,
    description: 'Список компонентов',
    type: [EquipmentComponent],
  })
  findAll(
    @Query('machineId') machineId?: string,
    @Query('componentType') componentType?: ComponentType,
    @Query('status') status?: ComponentStatus,
  ): Promise<EquipmentComponent[]> {
    return this.componentsService.findAll(machineId, componentType, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику компонентов' })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiResponse({ status: 200, description: 'Статистика компонентов' })
  getStats(@Query('machineId') machineId?: string) {
    return this.componentsService.getComponentStats(machineId);
  }

  @Get('needs-maintenance')
  @ApiOperation({ summary: 'Получить компоненты, требующие обслуживания' })
  @ApiResponse({
    status: 200,
    description: 'Компоненты, требующие обслуживания',
    type: [EquipmentComponent],
  })
  getNeedingMaintenance(): Promise<EquipmentComponent[]> {
    return this.componentsService.getComponentsNeedingMaintenance();
  }

  @Get('nearing-lifetime')
  @ApiOperation({ summary: 'Получить компоненты, близкие к выработке ресурса' })
  @ApiResponse({
    status: 200,
    description: 'Компоненты близкие к выработке ресурса',
    type: [EquipmentComponent],
  })
  getNearingLifetime(): Promise<EquipmentComponent[]> {
    return this.componentsService.getComponentsNearingLifetime();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить компонент по ID' })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({ status: 200, description: 'Данные компонента', type: EquipmentComponent })
  @ApiResponse({ status: 404, description: 'Компонент не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EquipmentComponent> {
    return this.componentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Обновить компонент' })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({ status: 200, description: 'Компонент обновлен', type: EquipmentComponent })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComponentDto,
  ): Promise<EquipmentComponent> {
    return this.componentsService.update(id, dto);
  }

  @Post(':id/replace')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Заменить компонент' })
  @ApiParam({ name: 'id', description: 'UUID старого компонента' })
  @ApiResponse({ status: 200, description: 'Компонент заменен', type: EquipmentComponent })
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceComponentDto,
  ): Promise<EquipmentComponent> {
    return this.componentsService.replaceComponent(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить компонент (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({ status: 204, description: 'Компонент удален' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.componentsService.remove(id);
  }

  // ============================================================================
  // НОВЫЕ ENDPOINTS ДЛЯ ПЕРЕМЕЩЕНИЙ КОМПОНЕНТОВ (REQ-ASSET-11)
  // ============================================================================

  @Post(':id/move')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Переместить компонент между локациями',
    description:
      'Перемещает компонент из текущей локации в новую. ' +
      'Автоматически создаёт запись в истории перемещений и обновляет current_location в компоненте.',
  })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'Компонент успешно перемещён',
    type: ComponentMovement,
  })
  @ApiResponse({
    status: 400,
    description: 'Невалидное перемещение (компонент уже в целевой локации или переход невозможен)',
  })
  async moveComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveComponentDto,
  ): Promise<ComponentMovement> {
    return await this.movementsService.createMovement({
      componentId: id,
      toLocationType: dto.to_location_type,
      toLocationRef: dto.to_location_ref,
      movementType: dto.movement_type,
      relatedMachineId: dto.related_machine_id,
      taskId: dto.task_id,
      comment: dto.comment,
    });
  }

  @Post(':id/install')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Установить компонент в машину',
    description:
      'Устанавливает компонент в указанную машину. ' +
      'Создаёт movement с типом INSTALL и обновляет machine_id компонента.',
  })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'Компонент установлен в машину',
    type: ComponentMovement,
  })
  async installComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstallComponentDto,
  ): Promise<ComponentMovement> {
    return await this.movementsService.createMovement({
      componentId: id,
      toLocationType: ComponentLocationType.MACHINE,
      toLocationRef: dto.machine_id,
      movementType: MovementType.INSTALL,
      relatedMachineId: dto.machine_id,
      taskId: dto.task_id,
      comment: dto.comment,
    });
  }

  @Post(':id/remove')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Снять компонент с машины',
    description:
      'Снимает компонент с машины и перемещает в указанную локацию (склад/мойка/ремонт). ' +
      'Создаёт movement с типом REMOVE и очищает machine_id компонента.',
  })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'Компонент снят с машины',
    type: ComponentMovement,
  })
  async removeComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemoveComponentDto,
  ): Promise<ComponentMovement> {
    return await this.movementsService.createMovement({
      componentId: id,
      toLocationType: dto.target_location,
      toLocationRef: dto.target_location_ref,
      movementType: MovementType.REMOVE,
      taskId: dto.task_id,
      comment: dto.comment,
    });
  }

  @Get(':id/movements')
  @ApiOperation({
    summary: 'Получить историю перемещений компонента',
    description: 'Возвращает полную историю всех перемещений компонента с деталями.',
  })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'История перемещений',
    type: [ComponentMovement],
  })
  async getComponentMovements(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComponentMovement[]> {
    return await this.movementsService.getComponentHistory(id);
  }

  @Get(':id/location')
  @ApiOperation({
    summary: 'Получить текущее местоположение компонента',
    description:
      'Возвращает информацию о текущем местоположении компонента и последнем перемещении.',
  })
  @ApiParam({ name: 'id', description: 'UUID компонента' })
  @ApiResponse({
    status: 200,
    description: 'Информация о местоположении',
  })
  async getComponentLocation(@Param('id', ParseUUIDPipe) id: string): Promise<{
    component: EquipmentComponent;
    lastMovement: ComponentMovement | null;
  }> {
    const component = await this.componentsService.findOne(id);
    const lastMovement = await this.movementsService.getLastMovement(id);

    return {
      component,
      lastMovement,
    };
  }
}
