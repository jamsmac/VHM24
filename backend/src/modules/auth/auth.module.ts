import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { SecurityModule } from '../security/security.module';
import { EmailModule } from '../email/email.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserSession } from './entities/user-session.entity';
import { PasswordPolicyService } from './services/password-policy.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { SessionService } from './services/session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { CookieService } from './services/cookie.service';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { IsStrongPasswordConstraint } from './decorators/is-strong-password.decorator';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken, UserSession]),
    UsersModule,
    RbacModule,
    forwardRef(() => SecurityModule),
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PasswordPolicyService,
    TwoFactorAuthService,
    SessionService,
    TokenBlacklistService,
    CookieService,
    IpWhitelistGuard,
    IsStrongPasswordConstraint,
  ],
  exports: [
    AuthService,
    PasswordPolicyService,
    TwoFactorAuthService,
    SessionService,
    TokenBlacklistService,
    CookieService,
    IpWhitelistGuard,
  ],
})
export class AuthModule {}
