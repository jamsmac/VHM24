import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TelegramNotificationsService } from '../services/telegram-notifications.service';
import { SendTelegramMessageDto } from '../dto/send-telegram-message.dto';

@ApiTags('telegram')
@Controller('telegram/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramNotificationsController {
  constructor(private readonly telegramNotificationsService: TelegramNotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a test notification via Telegram' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  @ApiResponse({ status: 404, description: 'User not found or not linked' })
  async sendNotification(@Body() dto: SendTelegramMessageDto) {
    await this.telegramNotificationsService.sendNotification({
      userId: dto.user_id,
      type: 'custom',
      title: 'Test Notification',
      message: dto.message,
    });

    return { message: 'Notification sent successfully' };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to check bot functionality' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(@Body() dto: { user_id: string }) {
    await this.telegramNotificationsService.sendNotification({
      userId: dto.user_id,
      type: 'custom',
      title: '🧪 Test Notification',
      message:
        'This is a test notification from VendHub. If you received this, your Telegram integration is working correctly!',
      actions: [
        {
          text: '✅ Confirm',
          callback_data: 'test_confirm',
        },
      ],
    });

    return { message: 'Test notification sent successfully' };
  }
}
