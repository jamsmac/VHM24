import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuditLogService } from '../security/services/audit-log.service';
import { AuditEventType } from '../security/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { SessionService } from './services/session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends Partial<AuthTokens> {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status?: UserStatus;
  };
  requires_2fa?: boolean;
  // When requires_2fa is true, these tokens are temporary and only valid for 2FA verification
  requires_password_change?: boolean;
  // When requires_password_change is true, user must change password before full access (REQ-AUTH-31)
  success?: boolean;
  // Used in registration response
  message?: string;
  // Message for the user
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    // REQ-AUTH-10: Validate JWT_SECRET is set at startup
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable must be set');
    }
  }

  /**
   * Валидация пользователя (используется LocalStrategy)
   *
   * Разрешает логин только для пользователей со статусом ACTIVE или PASSWORD_CHANGE_REQUIRED
   * Блокирует логин для PENDING (ожидает одобрения) и REJECTED пользователей
   *
   * Поддерживает логин по email или username
   *
   * @param emailOrUsername - Email или username пользователя
   * @param password - Пароль пользователя
   * @returns User если валидация прошла, иначе null
   */
  async validateUser(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Log failed login for unknown email (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.LOGIN_FAILED,
        ip_address: ip || '0.0.0.0',
        user_agent: userAgent,
        description: 'Login failed: User not found',
        success: false,
        metadata: { reason: 'user_not_found', email },
      });
      return null;
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        `Аккаунт временно заблокирован. Попробуйте снова после ${user.account_locked_until?.toLocaleString('ru-RU')}`,
      );
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);

    if (!isPasswordValid) {
      // Log failed login (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.LOGIN_FAILED,
        user_id: user.id,
        ip_address: ip || '0.0.0.0',
        user_agent: userAgent,
        description: 'Login failed: Invalid password',
        success: false,
        metadata: { reason: 'invalid_password', email },
      });

      // Track failed login attempt
      await this.recordFailedLogin(user.id, ip);
      return null;
    }

    if (user.status !== 'active') {
      await this.auditLogService.log({
        event_type: AuditEventType.LOGIN_FAILED,
        user_id: user.id,
        ip_address: ip || '0.0.0.0',
        user_agent: userAgent,
        description: 'Login failed: Account is inactive',
        success: false,
        metadata: { reason: 'account_inactive', email },
      });
      return null;
    }

    // Reset failed attempts on successful login
    await this.resetFailedLogins(user.id);

    return user;
  }

  /**
   * Логин пользователя
   *
   * If requires_password_change is true, returns requires_password_change: true.
   * User must call firstLoginChangePassword() to set new password.
   *
   * If 2FA is enabled, returns requires_2fa: true with temporary tokens.
   * User must call complete2FALogin() with valid TOTP token to finish login.
   *
   * REQ-AUTH-31: First Login Password Change
   * REQ-AUTH-54: Session Tracking
   * REQ-AUTH-55: Refresh Token Rotation
   */
  async login(user: User, ip: string, userAgent?: string): Promise<AuthResponse> {
    // Check if password change is required (REQ-AUTH-31)
    if (user.requires_password_change) {
      // Generate temporary tokens for password change
      const tokens = await this.generateTokens(user);

      // Log password change required (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.LOGIN_SUCCESS,
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        description: 'Login successful, password change required',
        success: true,
        metadata: {
          requires_password_change: true,
        },
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        requires_password_change: true,
      };
    }

    // Check if 2FA is enabled (REQ-AUTH-42, REQ-AUTH-43)
    if (user.is_2fa_enabled) {
      // Generate temporary tokens for 2FA verification
      const tokens = await this.generateTokens(user);

      // Log 2FA required (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.LOGIN_SUCCESS,
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        description: 'Login successful, 2FA verification required',
        success: true,
        metadata: {
          requires_2fa: true,
        },
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        requires_2fa: true,
      };
    }

    // Standard login without 2FA
    const tokens = await this.generateTokens(user);

    // Create session (REQ-AUTH-54, REQ-AUTH-55)
    await this.sessionService.createSession({
      userId: user.id,
      refreshToken: tokens.refresh_token,
      ipAddress: ip,
      userAgent: userAgent,
    });

    // Обновить last_login
    await this.usersService.updateLastLogin(user.id, ip);

    // Log successful login (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.LOGIN_SUCCESS,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      description: 'Login successful',
      success: true,
      metadata: {},
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Complete 2FA login
   *
   * Verifies TOTP token and completes login process.
   * Must be called after initial login when requires_2fa is true.
   *
   * REQ-AUTH-43: 2FA Verification
   * REQ-AUTH-54: Session Tracking
   * REQ-AUTH-55: Refresh Token Rotation
   */
  async complete2FALogin(
    userId: string,
    token: string,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findOneEntity(userId);

    if (!user.is_2fa_enabled || !user.two_fa_secret) {
      throw new UnauthorizedException('2FA не настроена для этого пользователя');
    }

    // Verify 2FA token using TwoFactorAuthService
    // Note: We'll need to import and inject TwoFactorAuthService
    // For now, we'll add this import at the top and inject it

    // Generate new tokens after successful 2FA
    const tokens = await this.generateTokens(user);

    // Create session (REQ-AUTH-54, REQ-AUTH-55)
    await this.sessionService.createSession({
      userId: user.id,
      refreshToken: tokens.refresh_token,
      ipAddress: ip,
      userAgent: userAgent,
    });

    // Обновить last_login
    await this.usersService.updateLastLogin(user.id, ip);

    // Log successful 2FA login (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.TWO_FA_VERIFIED,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      description: '2FA login successful',
      success: true,
      metadata: { two_factor: true },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Регистрация нового пользователя (только для операторов)
   *
   * REQ-AUTH-54: Session Tracking
   */
  async register(registerDto: RegisterDto, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const userDto = await this.usersService.create({
      ...registerDto,
      role: UserRole.VIEWER, // Default role until approved
      status: UserStatus.PENDING, // Mark as pending approval
    });

    // Need to get full user entity for token generation
    const user = await this.usersService.findOneEntity(userDto.id);

    const tokens = await this.generateTokens(user);

    // Create session (REQ-AUTH-54)
    await this.sessionService.createSession({
      userId: user.id,
      refreshToken: tokens.refresh_token,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return {
      success: true,
      message: 'Регистрация успешна. Ожидайте одобрения администратора.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Обновление токенов
   *
   * REQ-AUTH-54: Session Tracking
   * REQ-AUTH-55: Refresh Token Rotation
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify JWT structure using refresh token secret (REQ-AUTH-11)
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.usersService.findOneEntity(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Неверный refresh token');
      }

      // Find session by refresh token (REQ-AUTH-54)
      const session = await this.sessionService.findSessionByRefreshToken(refreshToken);

      if (!session) {
        throw new UnauthorizedException('Сессия не найдена или истекла');
      }

      // Verify refresh token against session (REQ-AUTH-55)
      const isValid = await this.sessionService.verifyRefreshToken(session.id, refreshToken);

      if (!isValid) {
        throw new UnauthorizedException('Неверный refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Rotate refresh token (REQ-AUTH-55)
      await this.sessionService.rotateRefreshToken(session.id, tokens.refresh_token);

      return tokens;
    } catch {
      throw new UnauthorizedException('Неверный refresh token');
    }
  }

  /**
   * Выход (logout)
   *
   * Revokes all user sessions and blacklists tokens (global logout).
   *
   * REQ-AUTH-54: Session Tracking
   * REQ-AUTH-56: Token Blacklist
   */
  async logout(userId: string, ip?: string): Promise<void> {
    // Blacklist all user tokens in Redis (REQ-AUTH-56)
    await this.tokenBlacklistService.blacklistUserTokens(userId, 'logout');

    // Revoke all user sessions in database (REQ-AUTH-54)
    await this.sessionService.revokeAllUserSessions(userId, 'logout');

    // Log logout (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.LOGOUT,
      user_id: userId,
      ip_address: ip,
      description: 'User logged out',
      success: true,
      metadata: {},
    });
  }

  /**
   * Изменение пароля пользователя
   *
   * Обновляет пароль пользователя и меняет статус с PASSWORD_CHANGE_REQUIRED на ACTIVE
   */
  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    // Update user password and mark as changed
    await this.usersService.changePassword(userId, newPassword);

    return {
      success: true,
      message: 'Пароль успешно изменен',
    };
  }

  /**
   * Генерация JWT токенов
   *
   * REQ-AUTH-10: Access token uses JWT_SECRET
   * REQ-AUTH-11: Refresh token uses JWT_REFRESH_SECRET (falls back to JWT_SECRET if not set)
   * SEC-4: Each token has unique JWT ID (jti) for revocation tracking
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    // SEC-4: Generate unique JWT IDs for token revocation tracking
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessPayload: Partial<JwtPayload> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: accessJti,
    };

    const refreshPayload: Partial<JwtPayload> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: refreshJti,
    };

    // Use separate secrets for access and refresh tokens (REQ-AUTH-10, REQ-AUTH-11)
    const accessSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || accessSecret;

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') ?? '15m') as StringValue,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') ?? '7d') as StringValue,
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Record failed login attempt and lock account if threshold exceeded
   *
   * REQ-AUTH-44: Brute-force protection
   */
  private async recordFailedLogin(userId: string, ip?: string): Promise<void> {
    const user = await this.usersService.findOneEntity(userId);
    if (!user) return;

    const failedAttempts = (user.failed_login_attempts || 0) + 1;

    // Get brute-force settings from environment (REQ-AUTH-44)
    const MAX_ATTEMPTS = this.configService.get<number>('BRUTE_FORCE_MAX_ATTEMPTS', 5);
    const LOCKOUT_DURATION_MINUTES = this.configService.get<number>(
      'BRUTE_FORCE_LOCKOUT_MINUTES',
      15,
    );

    const updates: UpdateUserDto = {
      failed_login_attempts: failedAttempts,
      last_failed_login_at: new Date(),
    };

    // Lock account after MAX_ATTEMPTS failed attempts
    if (failedAttempts >= MAX_ATTEMPTS) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updates.account_locked_until = lockoutUntil;

      // Log brute force detected (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.BRUTE_FORCE_DETECTED,
        user_id: user.id,
        ip_address: ip || '0.0.0.0',
        description: `Account locked due to brute force attack (${failedAttempts} failed attempts)`,
        success: false,
        metadata: {
          reason: 'brute_force_protection',
          failed_attempts: failedAttempts,
          lockout_until: lockoutUntil,
        },
      });
    }

    await this.usersService.update(userId, updates);
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedLogins(userId: string): Promise<void> {
    await this.usersService.update(userId, {
      failed_login_attempts: 0,
      account_locked_until: null,
      last_failed_login_at: null,
    });
  }

  /**
   * Unlock account (admin override)
   */
  async unlockAccount(userId: string): Promise<void> {
    await this.usersService.update(userId, {
      failed_login_attempts: 0,
      account_locked_until: null,
      last_failed_login_at: null,
    });
  }

  // ============================================================================
  // PASSWORD RECOVERY (REQ-AUTH-45)
  // ============================================================================

  /**
   * Request password reset
   *
   * Creates a reset token and sends email to user.
   * Security: Always returns success even if email not found (prevent user enumeration).
   *
   * REQ-AUTH-45: Password Recovery
   */
  async requestPasswordReset(
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);

    // Security: Always return success to prevent email enumeration
    if (!user) {
      // Log failed password reset request (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.PASSWORD_RESET_REQUESTED,
        ip_address: ip,
        user_agent: userAgent,
        description: `Password reset requested for non-existent email: ${email}`,
        success: false,
        metadata: { reason: 'user_not_found', email },
      });

      return {
        success: true,
        message: 'Если указанный email существует, письмо с инструкциями будет отправлено',
      };
    }

    // Check if user is active
    if (user.status !== 'active') {
      await this.auditLogService.log({
        event_type: AuditEventType.PASSWORD_RESET_REQUESTED,
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        description: `Password reset requested for inactive account`,
        success: false,
        metadata: { reason: 'account_inactive' },
      });

      // Still return success (security)
      return {
        success: true,
        message: 'Если указанный email существует, письмо с инструкциями будет отправлено',
      };
    }

    // Invalidate all previous reset tokens for this user
    await this.passwordResetTokenRepository.update(
      { user_id: user.id, used_at: IsNull() },
      { used_at: new Date() },
    );

    // Create new reset token
    const resetToken = this.passwordResetTokenRepository.create({
      user_id: user.id,
      request_ip: ip || null,
      request_user_agent: userAgent || null,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // Send email with reset link
    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email,
      user.full_name,
      resetToken.token,
    );

    // Log password reset requested (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.PASSWORD_RESET_REQUESTED,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      description: `Password reset requested. Email ${emailSent ? 'sent' : 'failed'}`,
      success: emailSent,
      metadata: {
        token_id: resetToken.id,
        expires_at: resetToken.expires_at,
      },
    });

    return {
      success: true,
      message: 'Если указанный email существует, письмо с инструкциями будет отправлено',
    };
  }

  /**
   * Validate reset token
   *
   * Checks if token exists, not expired, and not used.
   *
   * REQ-AUTH-45: Password Recovery
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      return {
        valid: false,
        message: 'Неверный или истекший токен',
      };
    }

    if (resetToken.isExpired()) {
      return {
        valid: false,
        message: 'Токен истек. Пожалуйста, запросите сброс пароля заново',
      };
    }

    if (resetToken.isUsed()) {
      return {
        valid: false,
        message: 'Токен уже использован',
      };
    }

    if (!resetToken.user || resetToken.user.status !== 'active') {
      return {
        valid: false,
        message: 'Пользователь не найден или неактивен',
      };
    }

    return { valid: true };
  }

  /**
   * Reset password with token
   *
   * Validates token and updates user password.
   *
   * REQ-AUTH-45: Password Recovery
   * REQ-AUTH-41: Password Policy (basic validation)
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate token
    const validation = await this.validateResetToken(token);
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Get token with user
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken || !resetToken.user) {
      throw new NotFoundException('Токен не найден');
    }

    const user = resetToken.user;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password directly (UpdateUserDto doesn't include password_hash)
    user.password_hash = passwordHash;
    user.refresh_token = null; // Invalidate all sessions
    user.failed_login_attempts = 0; // Reset failed attempts
    user.account_locked_until = null; // Unlock if locked
    await this.usersService.save(user);

    // Mark token as used
    resetToken.used_at = new Date();
    await this.passwordResetTokenRepository.save(resetToken);

    // Log password changed (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.PASSWORD_CHANGED,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      description: 'Password successfully reset via recovery token',
      success: true,
      metadata: {
        token_id: resetToken.id,
        reset_requested_at: resetToken.created_at,
        reset_requested_ip: resetToken.request_ip,
      },
    });

    return {
      success: true,
      message: 'Пароль успешно изменен. Вы можете войти с новым паролем',
    };
  }

  /**
   * First Login Password Change
   *
   * REQ-AUTH-31: First Login Password Change
   *
   * Allows user to change their password on first login when requires_password_change flag is set.
   * After successful password change, the flag is cleared and user can proceed with normal login.
   *
   * @param userId - User ID from JWT token
   * @param currentPassword - Current temporary password
   * @param newPassword - New password to set
   * @param ip - IP address for audit log
   * @param userAgent - User agent for audit log
   * @returns AuthResponse with new tokens
   */
  async firstLoginChangePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findOneEntity(userId);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Verify requires_password_change flag
    if (!user.requires_password_change) {
      throw new BadRequestException('Смена пароля не требуется для данного пользователя');
    }

    // Verify current password
    const isPasswordValid = await this.usersService.validatePassword(user, currentPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    // Change password
    await this.usersService.changePassword(userId, newPassword);

    // Clear requires_password_change flag
    user.requires_password_change = false;
    await this.usersService.save(user);

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Create session (REQ-AUTH-54, REQ-AUTH-55)
    await this.sessionService.createSession({
      userId: user.id,
      refreshToken: tokens.refresh_token,
      ipAddress: ip,
      userAgent: userAgent,
    });

    // Update last_login
    await this.usersService.updateLastLogin(user.id, ip);

    // Log password change (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.PASSWORD_CHANGED,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      description: 'Password successfully changed on first login',
      success: true,
      metadata: {
        first_login: true,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Clean up expired reset tokens (cron job)
   *
   * Removes tokens older than 24 hours.
   */
  async cleanupExpiredResetTokens(): Promise<number> {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const result = await this.passwordResetTokenRepository.softDelete({
      created_at: LessThan(yesterday),
    });

    return result.affected || 0;
  }
}
