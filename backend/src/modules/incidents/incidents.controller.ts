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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IncidentsService } from './incidents.service';
import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentPriority,
} from './entities/incident.entity';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  ResolveIncidentDto,
} from './dto/create-incident.dto';

@ApiTags('Incidents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Создать инцидент' })
  @ApiResponse({
    status: 201,
    description: 'Инцидент создан',
    type: Incident,
  })
  create(@Body() dto: CreateIncidentDto): Promise<Incident> {
    return this.incidentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список инцидентов с фильтрацией' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IncidentStatus,
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: IncidentType,
    description: 'Фильтр по типу',
  })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: IncidentPriority,
    description: 'Фильтр по приоритету',
  })
  @ApiQuery({
    name: 'assignedToUserId',
    required: false,
    type: String,
    description: 'Фильтр по назначенному',
  })
  @ApiResponse({
    status: 200,
    description: 'Список инцидентов',
    type: [Incident],
  })
  findAll(
    @Query('status') status?: IncidentStatus,
    @Query('type') type?: IncidentType,
    @Query('machineId') machineId?: string,
    @Query('priority') priority?: IncidentPriority,
    @Query('assignedToUserId') assignedToUserId?: string,
  ): Promise<Incident[]> {
    return this.incidentsService.findAll(status, type, machineId, priority, assignedToUserId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику инцидентов' })
  @ApiResponse({
    status: 200,
    description: 'Статистика инцидентов',
  })
  getStats() {
    return this.incidentsService.getStats();
  }

  @Get('critical')
  @ApiOperation({ summary: 'Получить критичные открытые инциденты' })
  @ApiResponse({
    status: 200,
    description: 'Список критичных инцидентов',
    type: [Incident],
  })
  getCriticalIncidents(): Promise<Incident[]> {
    return this.incidentsService.getCriticalIncidents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить инцидент по ID' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Данные инцидента',
    type: Incident,
  })
  @ApiResponse({ status: 404, description: 'Инцидент не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Incident> {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить инцидент' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Инцидент обновлен',
    type: Incident,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ): Promise<Incident> {
    return this.incidentsService.update(id, dto);
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Назначить инцидент специалисту' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Инцидент назначен',
    type: Incident,
  })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
  ): Promise<Incident> {
    return this.incidentsService.assign(id, userId);
  }

  @Post(':id/resolve')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Решить инцидент' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Инцидент решен',
    type: Incident,
  })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveIncidentDto,
  ): Promise<Incident> {
    return this.incidentsService.resolve(id, dto);
  }

  @Post(':id/close')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Закрыть инцидент' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Инцидент закрыт',
    type: Incident,
  })
  close(@Param('id', ParseUUIDPipe) id: string): Promise<Incident> {
    return this.incidentsService.close(id);
  }

  @Post(':id/reopen')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Переоткрыть инцидент' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({
    status: 200,
    description: 'Инцидент переоткрыт',
    type: Incident,
  })
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<Incident> {
    return this.incidentsService.reopen(id, reason);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить инцидент (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID инцидента' })
  @ApiResponse({ status: 204, description: 'Инцидент удален' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.incidentsService.remove(id);
  }
}
