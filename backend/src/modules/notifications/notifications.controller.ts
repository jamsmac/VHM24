import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
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
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Создать и отправить уведомление' })
  @ApiResponse({
    status: 201,
    description: 'Уведомление создано и отправлено',
    type: Notification,
  })
  create(@Body() dto: CreateNotificationDto): Promise<Notification> {
    return this.notificationsService.create(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Массовая отправка уведомлений' })
  @ApiResponse({
    status: 201,
    description: 'Уведомления созданы и отправлены',
    type: [Notification],
  })
  createBulk(@Body() dto: BulkNotificationDto): Promise<Notification[]> {
    return this.notificationsService.createBulk(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Получить мои уведомления' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: NotificationStatus,
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Только непрочитанные',
  })
  @ApiResponse({
    status: 200,
    description: 'Список уведомлений',
    type: [Notification],
  })
  getMyNotifications(
    @Request() req: any,
    @Query('status') status?: NotificationStatus,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<Notification[]> {
    const userId = req.user.id;
    return this.notificationsService.getUserNotifications(userId, status, unreadOnly === true);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику уведомлений' })
  @ApiResponse({
    status: 200,
    description: 'Статистика уведомлений',
  })
  getStats(@Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить уведомление по ID' })
  @ApiParam({ name: 'id', description: 'UUID уведомления' })
  @ApiResponse({
    status: 200,
    description: 'Данные уведомления',
    type: Notification,
  })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  @ApiParam({ name: 'id', description: 'UUID уведомления' })
  @ApiResponse({
    status: 200,
    description: 'Уведомление отмечено как прочитанное',
    type: Notification,
  })
  markAsRead(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  @ApiResponse({
    status: 204,
    description: 'Все уведомления отмечены как прочитанные',
  })
  markAllAsRead(@Request() req: any): Promise<void> {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Повторно отправить уведомление' })
  @ApiParam({ name: 'id', description: 'UUID уведомления' })
  @ApiResponse({
    status: 200,
    description: 'Уведомление отправлено повторно',
    type: Notification,
  })
  resend(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.sendNotification(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить уведомление' })
  @ApiParam({ name: 'id', description: 'UUID уведомления' })
  @ApiResponse({ status: 204, description: 'Уведомление удалено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.notificationsService.remove(id);
  }

  // ============================================================================
  // PREFERENCES ENDPOINTS
  // ============================================================================

  @Get('preferences/my')
  @ApiOperation({ summary: 'Получить мои настройки уведомлений' })
  @ApiResponse({
    status: 200,
    description: 'Настройки уведомлений',
    type: [NotificationPreference],
  })
  getMyPreferences(@Request() req: any): Promise<NotificationPreference[]> {
    const userId = req.user.id;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Создать настройку уведомления' })
  @ApiResponse({
    status: 201,
    description: 'Настройка создана',
    type: NotificationPreference,
  })
  createPreference(
    @Body() dto: CreateNotificationPreferenceDto,
    @Request() req: any,
  ): Promise<NotificationPreference> {
    const userId = req.user.id;
    return this.notificationsService.createPreference(userId, dto);
  }

  @Patch('preferences/:type/:channel')
  @ApiOperation({ summary: 'Обновить настройку уведомления' })
  @ApiParam({ name: 'type', enum: NotificationType, description: 'Тип уведомления' })
  @ApiParam({ name: 'channel', enum: NotificationChannel, description: 'Канал' })
  @ApiResponse({
    status: 200,
    description: 'Настройка обновлена',
    type: NotificationPreference,
  })
  updatePreference(
    @Param('type') type: NotificationType,
    @Param('channel') channel: NotificationChannel,
    @Body() dto: UpdateNotificationPreferenceDto,
    @Request() req: any,
  ): Promise<NotificationPreference> {
    const userId = req.user.id;
    return this.notificationsService.updatePreference(userId, type, channel, dto);
  }

  @Delete('preferences/:type/:channel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить настройку уведомления' })
  @ApiParam({ name: 'type', enum: NotificationType, description: 'Тип уведомления' })
  @ApiParam({ name: 'channel', enum: NotificationChannel, description: 'Канал' })
  @ApiResponse({ status: 204, description: 'Настройка удалена' })
  removePreference(
    @Param('type') type: NotificationType,
    @Param('channel') channel: NotificationChannel,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    return this.notificationsService.removePreference(userId, type, channel);
  }
}
