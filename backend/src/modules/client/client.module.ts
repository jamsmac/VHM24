import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import {
  ClientUser,
  ClientOrder,
  ClientPayment,
  ClientLoyaltyAccount,
  ClientLoyaltyLedger,
  ClientWallet,
  ClientWalletLedger,
} from './entities';

// Services
import {
  ClientPublicService,
  ClientAuthService,
  ClientLoyaltyService,
} from './services';

// Controllers
import {
  ClientPublicController,
  ClientAuthController,
  ClientLoyaltyController,
} from './controllers';

// Guards
import { ClientAuthGuard } from './guards/client-auth.guard';

// External entities needed for relations
import { Location } from '@modules/locations/entities/location.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';

/**
 * Client module - handles client-facing functionality:
 * - Public API (locations, menu, QR resolution)
 * - Client authentication (Telegram Web App)
 * - Loyalty program (points earning/redemption)
 * - Orders (Phase 2)
 * - Wallet (Phase 2)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Client entities
      ClientUser,
      ClientOrder,
      ClientPayment,
      ClientLoyaltyAccount,
      ClientLoyaltyLedger,
      ClientWallet,
      ClientWalletLedger,
      // External entities for queries
      Location,
      Machine,
      Nomenclature,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    ClientPublicController,
    ClientAuthController,
    ClientLoyaltyController,
  ],
  providers: [
    ClientPublicService,
    ClientAuthService,
    ClientLoyaltyService,
    ClientAuthGuard,
  ],
  exports: [
    ClientPublicService,
    ClientAuthService,
    ClientLoyaltyService,
    ClientAuthGuard,
  ],
})
export class ClientModule {}
