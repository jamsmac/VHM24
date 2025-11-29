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
import { WashingSchedulesService } from '../services/washing-schedules.service';
import { WashingSchedule } from '../entities/washing-schedule.entity';
import {
  CreateWashingScheduleDto,
  UpdateWashingScheduleDto,
  CompleteWashingDto,
} from '../dto/washing-schedule.dto';

@ApiTags('Equipment - Washing Schedules')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment/washing-schedules')
export class WashingSchedulesController {
  constructor(private readonly washingSchedulesService: WashingSchedulesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Создать график мойки' })
  @ApiResponse({
    status: 201,
    description: 'График мойки создан',
    type: WashingSchedule,
  })
  create(@Body() dto: CreateWashingScheduleDto): Promise<WashingSchedule> {
    return this.washingSchedulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список графиков мойки' })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'Список графиков мойки',
    type: [WashingSchedule],
  })
  findAll(
    @Query('machineId') machineId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<WashingSchedule[]> {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.washingSchedulesService.findAll(machineId, active);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику графиков мойки' })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiResponse({ status: 200, description: 'Статистика графиков мойки' })
  getStats(@Query('machineId') machineId?: string) {
    return this.washingSchedulesService.getStats(machineId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Получить просроченные графики мойки' })
  @ApiResponse({
    status: 200,
    description: 'Просроченные графики мойки',
    type: [WashingSchedule],
  })
  getOverdue(): Promise<WashingSchedule[]> {
    return this.washingSchedulesService.getOverdueSchedules();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Получить предстоящие графики мойки' })
  @ApiQuery({
    name: 'daysAhead',
    required: false,
    type: Number,
    example: 7,
    description: 'Количество дней вперед (по умолчанию 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Предстоящие графики мойки',
    type: [WashingSchedule],
  })
  getUpcoming(@Query('daysAhead') daysAhead?: string): Promise<WashingSchedule[]> {
    const days = daysAhead ? parseInt(daysAhead, 10) : 7;
    return this.washingSchedulesService.getUpcomingSchedules(days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить график мойки по ID' })
  @ApiParam({ name: 'id', description: 'UUID графика мойки' })
  @ApiResponse({
    status: 200,
    description: 'Данные графика мойки',
    type: WashingSchedule,
  })
  @ApiResponse({ status: 404, description: 'График мойки не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WashingSchedule> {
    return this.washingSchedulesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Обновить график мойки' })
  @ApiParam({ name: 'id', description: 'UUID графика мойки' })
  @ApiResponse({
    status: 200,
    description: 'График мойки обновлен',
    type: WashingSchedule,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWashingScheduleDto,
  ): Promise<WashingSchedule> {
    return this.washingSchedulesService.update(id, dto);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Отметить мойку как выполненную' })
  @ApiParam({ name: 'id', description: 'UUID графика мойки' })
  @ApiResponse({
    status: 200,
    description: 'Мойка отмечена как выполненная',
    type: WashingSchedule,
  })
  completeWashing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteWashingDto,
  ): Promise<WashingSchedule> {
    return this.washingSchedulesService.completeWashing(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить график мойки (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID графика мойки' })
  @ApiResponse({ status: 204, description: 'График мойки удален' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.washingSchedulesService.remove(id);
  }
}
