import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { TelegramUser, TelegramUserStatus } from '../entities/telegram-user.entity';
import { UpdateTelegramUserDto } from '../dto/update-telegram-user.dto';
import { LinkTelegramDto } from '../dto/link-telegram.dto';

// Constants for rate limiting and expiration
const CODE_EXPIRATION_MINUTES = 15;
const CODE_GENERATION_MAX_PER_HOUR = 3;
const VERIFICATION_ATTEMPT_MAX = 5;
const VERIFICATION_ATTEMPT_WINDOW_MINUTES = 15;

@Injectable()
export class TelegramUsersService {
  // Security constants
  private readonly VERIFICATION_CODE_EXPIRY_MINUTES = 15;
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MINUTES = 15;
  private readonly BLOCK_DURATION_MINUTES = 30;

  constructor(
    @InjectRepository(TelegramUser)
    private telegramUserRepository: Repository<TelegramUser>,
  ) {}

  async findAll(): Promise<TelegramUser[]> {
    return this.telegramUserRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TelegramUser> {
    const telegramUser = await this.telegramUserRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!telegramUser) {
      throw new NotFoundException(`Telegram user with ID ${id} not found`);
    }

    return telegramUser;
  }

  async findByUserId(userId: string): Promise<TelegramUser | null> {
    return this.telegramUserRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  async findByTelegramId(telegramId: string): Promise<TelegramUser | null> {
    return this.telegramUserRepository.findOne({
      where: { telegram_id: telegramId },
      relations: ['user'],
    });
  }

  async findByVerificationCode(code: string): Promise<TelegramUser | null> {
    const user = await this.telegramUserRepository.findOne({
      where: { verification_code: code, is_verified: false },
    });

    if (!user) {
      return null;
    }

    // Check if verification code has expired
    if (user.verification_code_expires_at) {
      const now = new Date();
      if (now > user.verification_code_expires_at) {
        // Code expired - clear it
        user.verification_code = null;
        user.verification_code_expires_at = null;
        await this.telegramUserRepository.save(user);
        return null;
      }
    }

    return user;
  }

  async generateVerificationCode(userId: string): Promise<string> {
    // Check if user already has a Telegram account linked
    const existing = await this.findByUserId(userId);
    if (existing && existing.is_verified) {
      throw new ConflictException('User already has a verified Telegram account');
    }

    // Rate limiting: Check if user exceeded code generation limit (max 3 per hour)
    // We use verification_code_expires_at to track code generation time
    if (existing && existing.verification_code_expires_at) {
      // Check if user has multiple recent verification attempts
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // If verification code was generated recently (within expiration window), limit requests
      if (existing.verification_attempts >= CODE_GENERATION_MAX_PER_HOUR) {
        const lastAttemptTime = existing.last_verification_attempt_at;
        if (lastAttemptTime && lastAttemptTime > hourAgo) {
          throw new BadRequestException(
            `Too many verification code requests. Maximum ${CODE_GENERATION_MAX_PER_HOUR} attempts per hour allowed. Try again later.`,
          );
        }
      }
    }

    // Generate cryptographically secure 6-byte code (12 hex characters)
    // Using 6 bytes (48 bits) provides sufficient entropy for a temporary code
    const code = randomBytes(6).toString('hex').toUpperCase();

    const now = new Date();

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.VERIFICATION_CODE_EXPIRY_MINUTES);

    if (existing) {
      // Update existing unverified account
      existing.verification_code = code;
      existing.verification_code_expires_at = expiresAt;
      existing.verification_attempts = 0; // Reset attempts counter
      existing.last_verification_attempt_at = null;
      existing.blocked_until = null; // Clear any existing block
      existing.is_verified = false;
      await this.telegramUserRepository.save(existing);
    } else {
      // Create new placeholder account
      const newUser = this.telegramUserRepository.create({
        user_id: userId,
        telegram_id: '0', // Will be updated when user starts the bot
        chat_id: '0',
        verification_code: code,
        verification_code_expires_at: expiresAt,
        verification_attempts: 0,
        is_verified: false,
      });
      await this.telegramUserRepository.save(newUser);
    }

    return code;
  }

  /**
   * Check if verification code is expired
   * @param codeGeneratedAt - Timestamp when code was generated
   * @returns true if code is expired, false if valid
   */
  private isCodeExpired(codeGeneratedAt: Date | null): boolean {
    if (!codeGeneratedAt) return true;
    const expirationTime = new Date(
      codeGeneratedAt.getTime() + CODE_EXPIRATION_MINUTES * 60 * 1000,
    );
    return new Date() > expirationTime;
  }

  /**
   * Check and increment verification attempt counter
   * @param telegramUser - TelegramUser entity
   * @throws BadRequestException if max attempts exceeded
   */
  private checkAndIncrementAttempts(telegramUser: TelegramUser): void {
    const now = new Date();
    const resetAt = telegramUser.last_verification_attempt_at;

    // Reset attempts if window has passed (using last_verification_attempt_at as reset reference)
    if (
      !resetAt ||
      now.getTime() - resetAt.getTime() > VERIFICATION_ATTEMPT_WINDOW_MINUTES * 60 * 1000
    ) {
      telegramUser.verification_attempts = 0;
      telegramUser.last_verification_attempt_at = now;
    }

    // Check if max attempts exceeded
    if (telegramUser.verification_attempts >= VERIFICATION_ATTEMPT_MAX) {
      throw new BadRequestException(
        `Too many verification attempts. Maximum ${VERIFICATION_ATTEMPT_MAX} attempts per ${VERIFICATION_ATTEMPT_WINDOW_MINUTES} minutes allowed. Try again later.`,
      );
    }

    // Increment attempt counter
    telegramUser.verification_attempts += 1;
    telegramUser.last_verification_attempt_at = now;
  }

  async linkTelegramAccount(
    telegramId: string,
    chatId: string,
    username: string | undefined,
    firstName: string | undefined,
    lastName: string | undefined,
    dto: LinkTelegramDto,
  ): Promise<TelegramUser> {
    // Find user by verification code
    let telegramUser = await this.telegramUserRepository.findOne({
      where: { verification_code: dto.verification_code, is_verified: false },
    });

    // Check if user is temporarily blocked
    if (telegramUser && telegramUser.blocked_until) {
      const now = new Date();
      if (now < telegramUser.blocked_until) {
        const minutesLeft = Math.ceil(
          (telegramUser.blocked_until.getTime() - now.getTime()) / 60000,
        );
        throw new ForbiddenException(
          `Too many failed attempts. Please try again in ${minutesLeft} minute(s).`,
        );
      } else {
        // Block expired, clear it
        telegramUser.blocked_until = null;
        telegramUser.verification_attempts = 0;
        await this.telegramUserRepository.save(telegramUser);
      }
    }

    // Validate verification code (with expiration check)
    const validUser = await this.findByVerificationCode(dto.verification_code);

    if (!validUser) {
      // Code invalid or expired - track failed attempt if user exists
      if (telegramUser) {
        await this.trackFailedVerificationAttempt(telegramUser);
      }
      throw new NotFoundException('Invalid or expired verification code');
    }

    telegramUser = validUser;

    // Check if this Telegram account is already linked to another user
    const existingLink = await this.findByTelegramId(telegramId);
    if (existingLink && existingLink.id !== telegramUser.id) {
      throw new ConflictException('This Telegram account is already linked to another user');
    }

    // Update telegram user with actual Telegram data
    telegramUser.telegram_id = telegramId;
    telegramUser.chat_id = chatId;
    telegramUser.username = username || null;
    telegramUser.first_name = firstName || null;
    telegramUser.last_name = lastName || null;
    telegramUser.is_verified = true;

    // Clear verification fields on success
    telegramUser.verification_code = null;
    telegramUser.verification_code_expires_at = null;
    telegramUser.verification_attempts = 0;
    telegramUser.last_verification_attempt_at = null;
    telegramUser.blocked_until = null;

    telegramUser.last_interaction_at = new Date();

    return this.telegramUserRepository.save(telegramUser);
  }

  /**
   * Track failed verification attempt and implement rate limiting
   *
   * Security strategy:
   * - Allow 5 failed attempts within 15 minutes
   * - After 5 failed attempts, block for 30 minutes
   * - Reset counter after rate limit window expires
   */
  private async trackFailedVerificationAttempt(telegramUser: TelegramUser): Promise<void> {
    const now = new Date();

    // Check if we're within the rate limit window
    if (telegramUser.last_verification_attempt_at) {
      const timeSinceLastAttempt =
        now.getTime() - telegramUser.last_verification_attempt_at.getTime();
      const rateLimitWindowMs = this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

      if (timeSinceLastAttempt > rateLimitWindowMs) {
        // Rate limit window expired, reset counter
        telegramUser.verification_attempts = 0;
      }
    }

    // Increment attempt counter
    telegramUser.verification_attempts += 1;
    telegramUser.last_verification_attempt_at = now;

    // Check if user exceeded max attempts
    if (telegramUser.verification_attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
      // Block user temporarily
      const blockedUntil = new Date();
      blockedUntil.setMinutes(blockedUntil.getMinutes() + this.BLOCK_DURATION_MINUTES);
      telegramUser.blocked_until = blockedUntil;
    }

    await this.telegramUserRepository.save(telegramUser);
  }

  async update(id: string, dto: UpdateTelegramUserDto): Promise<TelegramUser> {
    const telegramUser = await this.findOne(id);

    if (dto.language !== undefined) {
      telegramUser.language = dto.language;
    }

    if (dto.status !== undefined) {
      telegramUser.status = dto.status;
    }

    if (dto.notification_preferences !== undefined) {
      telegramUser.notification_preferences = {
        ...telegramUser.notification_preferences,
        ...dto.notification_preferences,
      };
    }

    return this.telegramUserRepository.save(telegramUser);
  }

  async updateLastInteraction(telegramId: string): Promise<void> {
    await this.telegramUserRepository.update(
      { telegram_id: telegramId },
      { last_interaction_at: new Date() },
    );
  }

  async delete(id: string): Promise<void> {
    const telegramUser = await this.findOne(id);
    await this.telegramUserRepository.softRemove(telegramUser);
  }

  async unlinkAccount(userId: string): Promise<void> {
    const telegramUser = await this.findByUserId(userId);

    if (!telegramUser) {
      throw new NotFoundException('No Telegram account linked for this user');
    }

    await this.telegramUserRepository.softRemove(telegramUser);
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    verified: number;
    unverified: number;
  }> {
    const total = await this.telegramUserRepository.count();
    const active = await this.telegramUserRepository.count({
      where: { status: TelegramUserStatus.ACTIVE },
    });
    const verified = await this.telegramUserRepository.count({
      where: { is_verified: true },
    });
    const unverified = await this.telegramUserRepository.count({
      where: { is_verified: false },
    });

    return { total, active, verified, unverified };
  }
}
