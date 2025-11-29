import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Request,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WebPushService } from './web-push.service';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribePushDto, SendPushNotificationDto } from './dto/push-subscription.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Web Push')
@Controller('web-push')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'Get VAPID public key for client-side subscription' })
  @ApiResponse({
    status: 200,
    description: 'VAPID public key',
    schema: {
      type: 'object',
      properties: {
        publicKey: { type: 'string' },
      },
    },
  })
  getPublicKey() {
    return {
      publicKey: this.webPushService.getPublicKey(),
    };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created/updated',
    type: PushSubscription,
  })
  subscribe(@Body() dto: SubscribePushDto, @Request() req: any): Promise<PushSubscription> {
    const userId = req.user.id;
    return this.webPushService.subscribe(userId, dto);
  }

  @Delete('unsubscribe/:endpoint')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiParam({
    name: 'endpoint',
    description: 'Base64 encoded endpoint URL',
  })
  @ApiResponse({ status: 204, description: 'Unsubscribed successfully' })
  async unsubscribe(
    @Param('endpoint') encodedEndpoint: string,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    const endpoint = Buffer.from(encodedEndpoint, 'base64').toString('utf-8');
    await this.webPushService.unsubscribe(userId, endpoint);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get user push subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'List of active subscriptions',
    type: [PushSubscription],
  })
  getSubscriptions(@Request() req: any): Promise<PushSubscription[]> {
    const userId = req.user.id;
    return this.webPushService.getUserSubscriptions(userId);
  }

  @Post('send')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send push notification (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of notifications sent',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number' },
      },
    },
  })
  async sendNotification(@Body() dto: SendPushNotificationDto): Promise<{ sent: number }> {
    const sent = await this.webPushService.sendToUser(dto.user_id, dto);
    return { sent };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification to yourself' })
  @ApiResponse({
    status: 200,
    description: 'Number of test notifications sent',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number' },
      },
    },
  })
  async sendTestNotification(@Request() req: any): Promise<{ sent: number }> {
    const userId = req.user.id;
    const sent = await this.webPushService.sendTestNotification(userId);
    return { sent };
  }
}
