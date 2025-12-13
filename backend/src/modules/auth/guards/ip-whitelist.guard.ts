import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '@modules/users/users.service';
import { User } from '@modules/users/entities/user.entity';

/**
 * IP Whitelist Guard
 *
 * REQ-AUTH-60: IP Whitelist для админов
 *
 * Проверяет IP адрес при входе для пользователей с включенным IP Whitelist.
 * Применяется в основном для SuperAdmin и Admin ролей для повышенной безопасности.
 *
 * Usage:
 * @UseGuards(IpWhitelistGuard)
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as User | undefined;

    // Если пользователь не аутентифицирован, пропускаем проверку
    // (другие guards должны обрабатывать аутентификацию)
    if (!user || !user.id) {
      return true;
    }

    // Получаем полные данные пользователя из БД
    const fullUser = await this.usersService.findOne(user.id);

    if (!fullUser) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Если IP Whitelist не включен, пропускаем проверку
    if (!fullUser.ip_whitelist_enabled) {
      return true;
    }

    // Получаем IP адрес клиента
    const clientIp = this.getClientIp(request);

    // Если список разрешенных IP пуст, блокируем доступ
    if (!fullUser.allowed_ips || fullUser.allowed_ips.length === 0) {
      throw new ForbiddenException(
        'IP Whitelist включен, но список разрешенных IP пуст. Обратитесь к администратору.',
      );
    }

    // Проверяем, находится ли IP в whitelist
    const isAllowed = this.isIpAllowed(clientIp, fullUser.allowed_ips);

    if (!isAllowed) {
      throw new ForbiddenException(
        `Доступ запрещен. Ваш IP адрес (${clientIp}) не находится в списке разрешенных.`,
      );
    }

    return true;
  }

  /**
   * Получает реальный IP адрес клиента с учетом прокси
   */
  private getClientIp(request: Request): string {
    // Проверяем заголовки прокси
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for может содержать несколько IP через запятую
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback на req.ip или socket
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Проверяет, находится ли IP в списке разрешенных
   * Поддерживает CIDR нотацию и wildcard
   */
  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    for (const allowedIp of allowedIps) {
      // Exact match
      if (clientIp === allowedIp) {
        return true;
      }

      // CIDR notation (e.g., 192.168.1.0/24)
      if (allowedIp.includes('/')) {
        if (this.isIpInCidr(clientIp, allowedIp)) {
          return true;
        }
      }

      // Wildcard (e.g., 192.168.1.*)
      if (allowedIp.includes('*')) {
        const regex = new RegExp(
          '^' + allowedIp.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$',
        );
        if (regex.test(clientIp)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Проверяет, находится ли IP в CIDR подсети
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [subnet, bits] = cidr.split('/');
    const subnetBits = parseInt(bits, 10);

    const ipNum = this.ipToNumber(ip);
    const subnetNum = this.ipToNumber(subnet);

    const mask = -1 << (32 - subnetBits);

    return (ipNum & mask) === (subnetNum & mask);
  }

  /**
   * Конвертирует IP адрес в число
   */
  private ipToNumber(ip: string): number {
    return (
      ip.split('.').reduce((acc, octet) => {
        return (acc << 8) + parseInt(octet, 10);
      }, 0) >>> 0
    );
  }
}
