import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TelegramUsersService } from '../services/telegram-users.service';
import { UpdateTelegramUserDto } from '../dto/update-telegram-user.dto';
import { TelegramUser } from '../entities/telegram-user.entity';
import { AuthenticatedRequest } from '../types/telegram.types';

@ApiTags('Telegram Users')
@Controller('telegram/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TelegramUsersController {
  constructor(private readonly telegramUsersService: TelegramUsersService) {}

  @Get()
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get all Telegram users (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all Telegram users', type: [TelegramUser] })
  async findAll(): Promise<TelegramUser[]> {
    return this.telegramUsersService.findAll();
  }

  @Get('statistics')
  @Roles('Admin', 'MANAGER', 'Owner')
  @ApiOperation({ summary: 'Get Telegram users statistics' })
  @ApiResponse({ status: 200, description: 'Returns statistics' })
  async getStatistics() {
    return this.telegramUsersService.getStatistics();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user Telegram account' })
  @ApiResponse({ status: 200, description: 'Returns Telegram account for current user' })
  @ApiResponse({ status: 404, description: 'No Telegram account linked' })
  async getMyTelegramAccount(@Request() req: AuthenticatedRequest) {
    const telegramUser = await this.telegramUsersService.findByUserId(req.user.userId);

    if (!telegramUser) {
      return { linked: false };
    }

    return {
      linked: true,
      verified: telegramUser.is_verified,
      telegram_user: telegramUser,
    };
  }

  @Post('generate-code')
  @ApiOperation({ summary: 'Generate verification code for linking Telegram' })
  @ApiResponse({ status: 200, description: 'Verification code generated' })
  async generateVerificationCode(@Request() req: AuthenticatedRequest) {
    const code = await this.telegramUsersService.generateVerificationCode(req.user.userId);

    return {
      verification_code: code,
      instructions:
        'Open Telegram bot and send this code to link your account. Code is valid for 24 hours.',
    };
  }

  @Delete('me')
  @ApiOperation({ summary: 'Unlink current user Telegram account' })
  @ApiResponse({ status: 200, description: 'Telegram account unlinked' })
  @ApiResponse({ status: 404, description: 'No Telegram account linked' })
  async unlinkMyAccount(@Request() req: AuthenticatedRequest) {
    await this.telegramUsersService.unlinkAccount(req.user.userId);

    return { message: 'Telegram account unlinked successfully' };
  }

  @Get(':id')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Get Telegram user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Telegram user UUID' })
  @ApiResponse({ status: 200, description: 'Returns Telegram user', type: TelegramUser })
  @ApiResponse({ status: 404, description: 'Telegram user not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TelegramUser> {
    return this.telegramUsersService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Update Telegram user (admin only)' })
  @ApiParam({ name: 'id', description: 'Telegram user UUID' })
  @ApiResponse({ status: 200, description: 'Telegram user updated', type: TelegramUser })
  @ApiResponse({ status: 404, description: 'Telegram user not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTelegramUserDto,
  ): Promise<TelegramUser> {
    return this.telegramUsersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Owner')
  @ApiOperation({ summary: 'Delete Telegram user (admin only)' })
  @ApiParam({ name: 'id', description: 'Telegram user UUID' })
  @ApiResponse({ status: 200, description: 'Telegram user deleted' })
  @ApiResponse({ status: 404, description: 'Telegram user not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.telegramUsersService.delete(id);

    return { message: 'Telegram user deleted successfully' };
  }
}
