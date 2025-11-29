import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeGateway } from './realtime.gateway';

/**
 * WebSocket Module
 *
 * Provides real-time updates via Socket.IO for:
 * - Commission calculations
 * - Queue job progress
 * - Dashboard metrics
 * - System notifications
 *
 * Connection: ws://localhost:3000
 * Namespace: /realtime
 * Authentication: JWT token via handshake auth/headers/query
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}
