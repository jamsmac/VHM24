import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FcmService } from './fcm.service';
import { FcmToken } from './entities/fcm-token.entity';
import { RegisterFcmTokenDto, SubscribeToTopicDto, SendFcmNotificationDto } from './dto/register-token.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RbacRolesGuard } from '@/modules/auth/guards/rbac-roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';

@ApiTags('FCM')
@Controller('fcm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacRolesGuard)
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check FCM configuration status' })
  @ApiResponse({
    status: 200,
    description: 'FCM status',
    schema: {
      type: 'object',
      properties: {
        configured: { type: 'boolean' },
      },
    },
  })
  getStatus() {
    return {
      configured: this.fcmService.isConfigured(),
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register FCM device token' })
  @ApiResponse({ status: 201, description: 'Token registered', type: FcmToken })
  register(@Body() dto: RegisterFcmTokenDto, @CurrentUser() user: User): Promise<FcmToken> {
    return this.fcmService.registerToken(user.id, dto);
  }

  @Delete('unregister/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister FCM device token' })
  @ApiParam({ name: 'token', description: 'FCM token to unregister' })
  @ApiResponse({ status: 204, description: 'Token unregistered' })
  async unregister(@Param('token') token: string, @CurrentUser() user: User): Promise<void> {
    await this.fcmService.unregisterToken(user.id, token);
  }

  @Get('tokens')
  @ApiOperation({ summary: 'Get user FCM tokens' })
  @ApiResponse({ status: 200, description: 'List of registered tokens', type: [FcmToken] })
  getTokens(@CurrentUser() user: User): Promise<FcmToken[]> {
    return this.fcmService.getUserTokens(user.id);
  }

  @Post('subscribe-topic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to a topic' })
  @ApiResponse({ status: 200, description: 'Subscribed to topic' })
  async subscribeToTopic(
    @Body() dto: SubscribeToTopicDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.fcmService.subscribeToTopic(user.id, dto.topic);
    return { success: true };
  }

  @Post('unsubscribe-topic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from a topic' })
  @ApiResponse({ status: 200, description: 'Unsubscribed from topic' })
  async unsubscribeFromTopic(
    @Body() dto: SubscribeToTopicDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.fcmService.unsubscribeFromTopic(user.id, dto.topic);
    return { success: true };
  }

  @Post('send')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send FCM notification (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Notifications sent',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number' },
      },
    },
  })
  async send(@Body() dto: SendFcmNotificationDto): Promise<{ sent: number }> {
    const sent = await this.fcmService.sendToUser(dto);
    return { sent };
  }
}
