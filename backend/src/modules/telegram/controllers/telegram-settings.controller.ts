import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { TelegramSettingsService } from '../services/telegram-settings.service';
import { UpdateTelegramSettingsDto } from '../dto/update-telegram-settings.dto';

@ApiTags('telegram')
@Controller('telegram/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TelegramSettingsController {
  constructor(private readonly telegramSettingsService: TelegramSettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get Telegram bot settings' })
  @ApiResponse({ status: 200, description: 'Returns Telegram settings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getSettings() {
    const settings = await this.telegramSettingsService.getSettings();

    // Don't expose the full bot token
    return {
      ...settings,
      bot_token: settings.bot_token ? `${settings.bot_token.substring(0, 10)}...` : null,
    };
  }

  @Get('info')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get bot configuration info' })
  @ApiResponse({ status: 200, description: 'Returns bot info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getBotInfo() {
    return this.telegramSettingsService.getBotInfo();
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update Telegram bot settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only super admin can update settings' })
  async updateSettings(@Body() dto: UpdateTelegramSettingsDto) {
    const settings = await this.telegramSettingsService.updateSettings(dto);

    // Don't expose the full bot token
    return {
      ...settings,
      bot_token: settings.bot_token ? `${settings.bot_token.substring(0, 10)}...` : null,
    };
  }
}
