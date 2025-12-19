import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ClientUser } from '../entities/client-user.entity';
import { ClientLoyaltyAccount } from '../entities/client-loyalty-account.entity';
import {
  TelegramAuthDto,
  ClientProfileDto,
  ClientAuthResponseDto,
  ClientUserResponseDto,
  ClientLanguage,
} from '../dto/client-auth.dto';

interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/**
 * Client authentication service.
 * Handles Telegram Web App authentication for client users.
 */
@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);
  private readonly botToken: string;
  private readonly jwtSecret: string;

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepository: Repository<ClientUser>,
    @InjectRepository(ClientLoyaltyAccount)
    private readonly loyaltyAccountRepository: Repository<ClientLoyaltyAccount>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
  }

  /**
   * Authenticate client via Telegram Web App initData
   */
  async authenticateTelegram(dto: TelegramAuthDto): Promise<ClientAuthResponseDto> {
    const { initData } = dto;

    // Parse and validate initData
    const userData = this.validateTelegramInitData(initData);

    if (!userData) {
      throw new UnauthorizedException('Invalid Telegram authentication data');
    }

    // Find or create client user
    let clientUser = await this.clientUserRepository.findOne({
      where: { telegram_id: userData.id.toString() },
    });

    const isNewUser = !clientUser;

    if (!clientUser) {
      // Create new client user
      clientUser = this.clientUserRepository.create({
        telegram_id: userData.id.toString(),
        telegram_username: userData.username || null,
        full_name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null,
        language: this.mapLanguageCode(userData.language_code),
        is_verified: true, // Telegram auth is verified
      });

      clientUser = await this.clientUserRepository.save(clientUser);

      // Create loyalty account for new user
      const loyaltyAccount = this.loyaltyAccountRepository.create({
        client_user_id: clientUser.id,
        points_balance: 0,
        lifetime_points: 0,
      });
      await this.loyaltyAccountRepository.save(loyaltyAccount);

      this.logger.log(`New client user created: ${clientUser.id} (Telegram: ${userData.id})`);
    } else {
      // Update telegram username if changed
      if (userData.username && userData.username !== clientUser.telegram_username) {
        clientUser.telegram_username = userData.username;
        await this.clientUserRepository.save(clientUser);
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(clientUser);

    // Get loyalty points
    const loyaltyAccount = await this.loyaltyAccountRepository.findOne({
      where: { client_user_id: clientUser.id },
    });

    return {
      ...tokens,
      user: this.mapToUserResponse(clientUser, loyaltyAccount?.points_balance || 0),
    };
  }

  /**
   * Refresh client access token
   */
  async refreshToken(refreshToken: string): Promise<ClientAuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtSecret,
      });

      if (payload.type !== 'client_refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const clientUser = await this.clientUserRepository.findOne({
        where: { id: payload.sub },
      });

      if (!clientUser) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(clientUser);

      const loyaltyAccount = await this.loyaltyAccountRepository.findOne({
        where: { client_user_id: clientUser.id },
      });

      return {
        ...tokens,
        user: this.mapToUserResponse(clientUser, loyaltyAccount?.points_balance || 0),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Update client profile
   */
  async updateProfile(
    clientUserId: string,
    dto: ClientProfileDto,
  ): Promise<ClientUserResponseDto> {
    const clientUser = await this.clientUserRepository.findOne({
      where: { id: clientUserId },
    });

    if (!clientUser) {
      throw new BadRequestException('User not found');
    }

    if (dto.full_name !== undefined) clientUser.full_name = dto.full_name;
    if (dto.phone !== undefined) clientUser.phone = dto.phone;
    if (dto.email !== undefined) clientUser.email = dto.email;
    if (dto.language !== undefined) clientUser.language = dto.language;

    await this.clientUserRepository.save(clientUser);

    const loyaltyAccount = await this.loyaltyAccountRepository.findOne({
      where: { client_user_id: clientUser.id },
    });

    return this.mapToUserResponse(clientUser, loyaltyAccount?.points_balance || 0);
  }

  /**
   * Get current client user
   */
  async getCurrentUser(clientUserId: string): Promise<ClientUserResponseDto> {
    const clientUser = await this.clientUserRepository.findOne({
      where: { id: clientUserId },
    });

    if (!clientUser) {
      throw new BadRequestException('User not found');
    }

    const loyaltyAccount = await this.loyaltyAccountRepository.findOne({
      where: { client_user_id: clientUser.id },
    });

    return this.mapToUserResponse(clientUser, loyaltyAccount?.points_balance || 0);
  }

  /**
   * Validate Telegram initData and extract user data
   * Based on https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  private validateTelegramInitData(initData: string): TelegramUserData | null {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      // Sort params alphabetically
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Calculate expected hash
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // In development, allow bypassing hash validation
      const isDev = this.configService.get('NODE_ENV') === 'development';
      if (!isDev && hash !== expectedHash) {
        this.logger.warn('Invalid Telegram hash');
        return null;
      }

      // Check auth_date is not too old (allow 24 hours)
      const authDate = parseInt(params.get('auth_date') || '0');
      const now = Math.floor(Date.now() / 1000);
      if (!isDev && now - authDate > 86400) {
        this.logger.warn('Telegram auth data expired');
        return null;
      }

      // Parse user data
      const userParam = params.get('user');
      if (!userParam) {
        return null;
      }

      return JSON.parse(userParam) as TelegramUserData;
    } catch (error) {
      this.logger.error('Failed to validate Telegram initData', error);
      return null;
    }
  }

  /**
   * Generate JWT tokens for client
   */
  private async generateTokens(
    clientUser: ClientUser,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: clientUser.id,
      telegram_id: clientUser.telegram_id,
      type: 'client_access',
    };

    const access_token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '1h',
    });

    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'client_refresh' },
      {
        secret: this.jwtSecret,
        expiresIn: '30d',
      },
    );

    return { access_token, refresh_token };
  }

  /**
   * Map language code to ClientLanguage enum
   */
  private mapLanguageCode(code?: string): ClientLanguage {
    if (!code) return ClientLanguage.RU;
    if (code.startsWith('uz')) return ClientLanguage.UZ;
    if (code.startsWith('en')) return ClientLanguage.EN;
    return ClientLanguage.RU;
  }

  /**
   * Map ClientUser entity to response DTO
   */
  private mapToUserResponse(user: ClientUser, loyaltyPoints: number): ClientUserResponseDto {
    return {
      id: user.id,
      telegram_username: user.telegram_username || undefined,
      telegram_id: user.telegram_id,
      full_name: user.full_name || undefined,
      phone: user.phone || undefined,
      email: user.email || undefined,
      is_verified: user.is_verified,
      language: user.language as ClientLanguage,
      created_at: user.created_at,
      loyalty_points: loyaltyPoints,
    };
  }
}
