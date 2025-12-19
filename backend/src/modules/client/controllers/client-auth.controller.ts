import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientAuthService } from '../services/client-auth.service';
import {
  TelegramAuthDto,
  ClientProfileDto,
  ClientAuthResponseDto,
  ClientUserResponseDto,
} from '../dto/client-auth.dto';
import {
  ClientAuthGuard,
  CurrentClientUser,
  ClientUserPayload,
} from '../guards/client-auth.guard';

/**
 * Client authentication controller.
 * Handles Telegram Web App authentication.
 */
@ApiTags('Client Auth')
@Controller('client/auth')
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Telegram Web App' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid authentication data' })
  async authenticateTelegram(@Body() dto: TelegramAuthDto): Promise<ClientAuthResponseDto> {
    return this.clientAuthService.authenticateTelegram(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() body: { refresh_token: string },
  ): Promise<ClientAuthResponseDto> {
    return this.clientAuthService.refreshToken(body.refresh_token);
  }

  @Get('me')
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current client user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(
    @CurrentClientUser() user: ClientUserPayload,
  ): Promise<ClientUserResponseDto> {
    return this.clientAuthService.getCurrentUser(user.id);
  }

  @Patch('profile')
  @UseGuards(ClientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update client profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentClientUser() user: ClientUserPayload,
    @Body() dto: ClientProfileDto,
  ): Promise<ClientUserResponseDto> {
    return this.clientAuthService.updateProfile(user.id, dto);
  }
}
