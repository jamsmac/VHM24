import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { DailyStats } from './entities/daily-stats.entity';
import { subDays, parseISO } from 'date-fns';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('daily')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить дневную статистику',
    description: 'Получить агрегированную статистику за указанную дату или сегодня',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Дата в формате YYYY-MM-DD (по умолчанию сегодня)',
    example: '2024-11-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика за день',
    type: DailyStats,
  })
  async getDailyStats(@Query('date') date?: string): Promise<DailyStats> {
    const targetDate = date ? parseISO(date) : new Date();
    const stats = await this.analyticsService.getStatsForDate(targetDate);

    // Если статистики нет, создаем и собираем
    if (!stats) {
      return this.analyticsService.rebuildDailyStats(targetDate);
    }

    return stats;
  }

  @Get('range')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить статистику за диапазон дат',
    description: 'Получить агрегированную статистику за указанный период',
  })
  @ApiQuery({
    name: 'start_date',
    required: true,
    description: 'Начальная дата в формате YYYY-MM-DD',
    example: '2024-11-01',
  })
  @ApiQuery({
    name: 'end_date',
    required: true,
    description: 'Конечная дата в формате YYYY-MM-DD',
    example: '2024-11-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Массив статистики по дням',
    type: [DailyStats],
  })
  async getStatsForRange(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ): Promise<DailyStats[]> {
    return this.analyticsService.getStatsForDateRange(parseISO(startDate), parseISO(endDate));
  }

  @Post('rebuild/:date')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Пересобрать статистику за дату (только админы)',
    description:
      'Полная пересборка агрегированной статистики за указанную дату. ' +
      'Используется для исправления несоответствий или первичной загрузки.',
  })
  @ApiParam({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD',
    example: '2024-11-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика успешно пересобрана',
    type: DailyStats,
  })
  async rebuildStats(@Param('date') date: string): Promise<DailyStats> {
    return this.analyticsService.rebuildDailyStats(parseISO(date));
  }

  @Get('yesterday')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить статистику за вчерашний день',
    description: 'Быстрый доступ к статистике за вчера',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика за вчера',
    type: DailyStats,
  })
  async getYesterdayStats(): Promise<DailyStats> {
    const yesterday = subDays(new Date(), 1);
    const stats = await this.analyticsService.getStatsForDate(yesterday);

    if (!stats) {
      return this.analyticsService.rebuildDailyStats(yesterday);
    }

    return stats;
  }

  @Get('last-7-days')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить статистику за последние 7 дней',
    description: 'Быстрый доступ к недельной статистике',
  })
  @ApiResponse({
    status: 200,
    description: 'Массив статистики за 7 дней',
    type: [DailyStats],
  })
  async getLast7DaysStats(): Promise<DailyStats[]> {
    const endDate = new Date();
    const startDate = subDays(endDate, 7);

    return this.analyticsService.getStatsForDateRange(startDate, endDate);
  }

  @Post('finalize/:date')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Финализировать день (закрыть день)',
    description:
      'Пересобрать и зафиксировать статистику за день. ' +
      'После финализации данные считаются окончательными.',
  })
  @ApiParam({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD',
    example: '2024-11-15',
  })
  @ApiResponse({
    status: 200,
    description: 'День успешно финализирован',
    type: DailyStats,
  })
  async finalizeDay(@Param('date') date: string): Promise<DailyStats> {
    return this.analyticsService.finalizeDay(parseISO(date));
  }
}
