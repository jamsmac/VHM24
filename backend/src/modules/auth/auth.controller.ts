import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Get,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { FirstLoginChangePasswordDto } from './dto/first-login-change-password.dto';
import { AuthResponseDto, AuthTokensDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { SessionService } from './services/session.service';
import { setAuthCookies, clearAuthCookies, COOKIE_NAMES } from './utils/cookie.utils';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({
    status: 200,
    description:
      'Успешная аутентификация. Токены устанавливаются в httpOnly cookies (SEC-1). Может вернуть requires_password_change=true (REQ-AUTH-31) или requires_2fa=true (REQ-AUTH-42) если требуется дополнительная верификация.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @ApiResponse({
    status: 403,
    description: 'IP адрес не находится в списке разрешенных (REQ-AUTH-60)',
  })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток входа. Превышен лимит (5 попыток в минуту).',
  })
  async login(
    @Body() _loginDto: LoginDto,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'];
    const authResponse = await this.authService.login(user, ip, userAgent);

    // SEC-1: Set httpOnly cookies for XSS protection
    if (authResponse.access_token && authResponse.refresh_token) {
      setAuthCookies(res, authResponse.access_token, authResponse.refresh_token);
    }

    return authResponse;
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  @ApiOperation({ summary: 'Регистрация нового пользователя (оператора)' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован. Токены устанавливаются в httpOnly cookies (SEC-1).',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email или телефон уже существует',
  })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток регистрации. Превышен лимит (3 попытки за 5 минут).',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const authResponse = await this.authService.register(registerDto, ip, userAgent);

    // SEC-1: Set httpOnly cookies for XSS protection
    if (authResponse.access_token && authResponse.refresh_token) {
      setAuthCookies(res, authResponse.access_token, authResponse.refresh_token);
    }

    return authResponse;
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute (SEC-2)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiResponse({
    status: 200,
    description: 'Токены успешно обновлены. Новые токены устанавливаются в httpOnly cookies (SEC-1).',
    type: AuthTokensDto,
  })
  @ApiResponse({ status: 401, description: 'Неверный refresh token' })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток обновления токенов. Превышен лимит (10 попыток в минуту).',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    // SEC-1: Read refresh token from httpOnly cookie first, fallback to body for backward compatibility
    const refreshToken =
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token не предоставлен');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // SEC-1: Set new httpOnly cookies
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);

    return tokens;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Выход из системы (глобальный - отзывает все сессии)' })
  @ApiResponse({ status: 204, description: 'Успешный выход. Cookies очищены (SEC-1).' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress;
    await this.authService.logout(user.id, ip);

    // SEC-1: Clear httpOnly cookies
    clearAuthCookies(res);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  // ============================================================================
  // PASSWORD RECOVERY (REQ-AUTH-45)
  // ============================================================================

  @Post('password-reset/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запросить сброс пароля',
    description:
      'Отправляет письмо с ссылкой для сброса пароля на указанный email. Всегда возвращает успех для безопасности (предотвращение перечисления пользователей).',
  })
  @ApiResponse({
    status: 200,
    description: 'Запрос принят. Если email существует, письмо будет отправлено',
  })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток сброса пароля. Превышен лимит (3 попытки в час).',
  })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'];
    return this.authService.requestPasswordReset(dto.email, ip, userAgent);
  }

  @Post('password-reset/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Проверить токен сброса пароля',
    description: 'Проверяет валидность токена сброса пароля (не истек, не использован)',
  })
  @ApiResponse({
    status: 200,
    description: 'Статус валидности токена',
  })
  async validateResetToken(
    @Body() dto: ValidateResetTokenDto,
  ): Promise<{ valid: boolean; message?: string }> {
    return this.authService.validateResetToken(dto.token);
  }

  @Post('password-reset/confirm')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Подтвердить сброс пароля',
    description: 'Устанавливает новый пароль используя валидный токен сброса',
  })
  @ApiResponse({
    status: 200,
    description: 'Пароль успешно изменен',
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный или истекший токен',
  })
  @ApiResponse({
    status: 429,
    description:
      'Слишком много попыток подтверждения сброса пароля. Превышен лимит (3 попытки в час).',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPassword(dto.token, dto.newPassword, ip, userAgent);
  }

  // ============================================================================
  // FIRST LOGIN PASSWORD CHANGE (REQ-AUTH-31)
  // ============================================================================

  @Post('first-login-change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Сменить пароль при первом входе (REQ-AUTH-31)',
    description:
      'Позволяет пользователю сменить временный пароль при первом входе. После смены пароля флаг requires_password_change снимается и пользователь получает полный доступ с новыми токенами.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Пароль успешно изменен, возвращаются новые токены в httpOnly cookies (SEC-1). Флаг requires_password_change снят.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Смена пароля не требуется или некорректные данные',
  })
  @ApiResponse({ status: 401, description: 'Неверный текущий пароль' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async firstLoginChangePassword(
    @CurrentUser() user: User,
    @Body() dto: FirstLoginChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'];
    const authResponse = await this.authService.firstLoginChangePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      ip,
      userAgent,
    );

    // SEC-1: Set httpOnly cookies for XSS protection
    if (authResponse.access_token && authResponse.refresh_token) {
      setAuthCookies(res, authResponse.access_token, authResponse.refresh_token);
    }

    return authResponse;
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION (REQ-AUTH-42, REQ-AUTH-43)
  // ============================================================================

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Настроить 2FA',
    description: 'Генерирует TOTP секрет и QR-код для настройки двухфакторной аутентификации',
  })
  @ApiResponse({
    status: 200,
    description: 'QR-код и секрет для настройки 2FA',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async setup2FA(@CurrentUser() user: User): Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
  }> {
    return this.twoFactorAuthService.generateSecret(user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Включить 2FA',
    description: 'Включает двухфакторную аутентификацию после верификации кода',
  })
  @ApiResponse({
    status: 200,
    description: '2FA успешно включена',
  })
  @ApiResponse({ status: 400, description: 'Неверный код подтверждения' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async enable2FA(
    @CurrentUser() user: User,
    @Body() dto: Enable2FADto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ip = req.ip || req.socket.remoteAddress;
    return this.twoFactorAuthService.enable2FA(user.id, dto.secret, dto.token, ip);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Отключить 2FA',
    description: 'Отключает двухфакторную аутентификацию после верификации текущего кода',
  })
  @ApiResponse({
    status: 200,
    description: '2FA успешно отключена',
  })
  @ApiResponse({ status: 400, description: 'Неверный код или 2FA уже отключена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async disable2FA(
    @CurrentUser() user: User,
    @Body() dto: Verify2FADto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ip = req.ip || req.socket.remoteAddress;
    return this.twoFactorAuthService.disable2FA(user.id, dto.token, ip);
  }

  @Post('2fa/verify')
  @UseGuards(ThrottlerGuard, JwtAuthGuard, IpWhitelistGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Проверить 2FA код',
    description: 'Проверяет код двухфакторной аутентификации',
  })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток проверки 2FA кода. Превышен лимит (10 попыток в минуту).',
  })
  async verify2FA(
    @CurrentUser() user: User,
    @Body() dto: Verify2FADto,
    @Req() req: Request,
  ): Promise<{ valid: boolean; message: string }> {
    const ip = req.ip || req.socket.remoteAddress;
    const isValid = await this.twoFactorAuthService.verifyToken(user.id, dto.token, ip);

    return {
      valid: isValid,
      message: isValid ? 'Код подтвержден' : 'Неверный код',
    };
  }

  @Post('2fa/login')
  @UseGuards(ThrottlerGuard, JwtAuthGuard, IpWhitelistGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Завершить вход с 2FA',
    description: 'Завершает процесс входа после верификации 2FA кода',
  })
  @ApiResponse({
    status: 200,
    description: 'Вход завершен, токены обновлены в httpOnly cookies (SEC-1)',
  })
  @ApiResponse({ status: 400, description: 'Неверный код 2FA' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 429,
    description: 'Слишком много попыток входа с 2FA. Превышен лимит (5 попыток в минуту).',
  })
  async complete2FALogin(
    @CurrentUser() user: User,
    @Body() dto: Verify2FADto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'];

    // Verify 2FA token first
    const isValid = await this.twoFactorAuthService.verifyToken(user.id, dto.token, ip);

    if (!isValid) {
      throw new BadRequestException('Неверный код двухфакторной аутентификации');
    }

    // Complete login
    const authResponse = await this.authService.complete2FALogin(user.id, dto.token, ip, userAgent);

    // SEC-1: Set httpOnly cookies for XSS protection
    if (authResponse.access_token && authResponse.refresh_token) {
      setAuthCookies(res, authResponse.access_token, authResponse.refresh_token);
    }

    return authResponse;
  }

  // ============================================================================
  // SESSION MANAGEMENT (REQ-AUTH-54, REQ-AUTH-55, REQ-AUTH-61)
  // ============================================================================

  @Get('sessions')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить активные сессии',
    description:
      'Возвращает список всех активных сессий текущего пользователя с информацией об устройствах',
  })
  @ApiResponse({
    status: 200,
    description: 'Список активных сессий',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getActiveSessions(@CurrentUser() user: User) {
    return this.sessionService.getActiveSessions(user.id);
  }

  @Get('sessions/all')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить все сессии',
    description: 'Возвращает все сессии пользователя (включая истекшие и отозванные)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список всех сессий',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getAllSessions(@CurrentUser() user: User) {
    return this.sessionService.getAllSessions(user.id);
  }

  @Post('sessions/:sessionId/revoke')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Отозвать конкретную сессию',
    description: 'Отзывает указанную сессию по ID',
  })
  @ApiResponse({ status: 204, description: 'Сессия успешно отозвана' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Сессия не найдена' })
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() _user: User,
  ): Promise<void> {
    await this.sessionService.revokeSession(sessionId, 'revoked_by_user');
  }

  @Post('sessions/revoke-others')
  @UseGuards(JwtAuthGuard, IpWhitelistGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Отозвать все другие сессии',
    description: 'Отзывает все сессии пользователя кроме текущей',
  })
  @ApiResponse({
    status: 200,
    description: 'Количество отозванных сессий',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async revokeOtherSessions(
    @CurrentUser() user: User,
    @Body() body: { currentRefreshToken: string },
  ): Promise<{ revoked: number }> {
    const revoked = await this.sessionService.revokeOtherSessions(
      user.id,
      body.currentRefreshToken,
    );

    return { revoked };
  }
}
