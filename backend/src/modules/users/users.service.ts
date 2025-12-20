import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateIpWhitelistDto } from './dto/update-ip-whitelist.dto';
import { UserResponseDto, UserListItemDto } from './dto/user-response.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { UsernameGeneratorService } from './services/username-generator.service';
import { PasswordGeneratorService } from './services/password-generator.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usernameGeneratorService: UsernameGeneratorService,
    private readonly passwordGeneratorService: PasswordGeneratorService,
  ) {}

  /**
   * Transform User entity to UserResponseDto
   * This method ensures no sensitive data is exposed
   */
  private toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Transform User entities to UserListItemDto
   */
  private toListDto(users: User[]): UserListItemDto[] {
    return plainToInstance(UserListItemDto, users, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Создание нового пользователя
   *
   * REQ-AUTH-31: При создании пользователя администратором устанавливается
   * флаг requires_password_change, чтобы пользователь сменил временный пароль
   * при первом входе.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Проверка существующего email
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Проверка существующего телефона
    if (createUserDto.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: createUserDto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Пользователь с таким телефоном уже существует');
      }
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(createUserDto.password, salt);

    // Создание пользователя
    // Use status from DTO if provided, otherwise default to PENDING (requires admin approval)
    const user = this.userRepository.create({
      ...createUserDto,
      password_hash,
      status: UserStatus.ACTIVE,
      // REQ-AUTH-31: Требовать смену пароля при первом входе
      requires_password_change: true,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toResponseDto(savedUser);
  }

  /**
   * Получение всех пользователей
   */
  async findAll(): Promise<UserListItemDto[]> {
    const users = await this.userRepository.find({
      order: { created_at: 'DESC' },
    });
    return this.toListDto(users);
  }

  /**
   * Получение пользователя по ID (публичный метод)
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    return this.toResponseDto(user);
  }

  /**
   * Получение пользователя по ID (внутренний метод, возвращает entity)
   * Используется для внутренней логики, где нужен полный объект
   */
  async findOneEntity(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    return user;
  }

  /**
   * Find multiple users by IDs
   * @param ids - Array of user UUIDs
   * @returns Array of users (may be less than input if some IDs not found)
   */
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: { id: In(ids) },
    });
  }

  /**
   * Получение пользователя по email (для аутентификации)
   * Включает password_hash для проверки пароля
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password_hash')
      .addSelect('user.two_fa_secret')
      .addSelect('user.refresh_token')
      .getOne();
  }

  /**
   * Получение пользователя по Telegram ID
   */
  async findByTelegramId(telegram_user_id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { telegram_user_id },
    });
  }

  /**
   * Получение пользователя по username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  /**
   * Обновление пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOneEntity(id);

    // Проверка уникальности email при изменении
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    // Проверка уникальности телефона при изменении
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: updateUserDto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Пользователь с таким телефоном уже существует');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Удаление пользователя (soft delete)
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOneEntity(id);
    await this.userRepository.softRemove(user);
  }

  /**
   * Обновление refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.userRepository.update(userId, { refresh_token: refreshToken });
  }

  /**
   * Обновление даты последнего входа
   */
  async updateLastLogin(userId: string, ip: string): Promise<void> {
    await this.userRepository.update(userId, {
      last_login_at: new Date(),
      last_login_ip: ip,
    });
  }

  /**
   * Проверка пароля
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Изменение пароля (для администраторов)
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await this.userRepository.update(userId, { password_hash });
  }

  /**
   * Save user entity
   * Used for direct entity updates
   */
  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  /**
   * Обновление настроек IP Whitelist для пользователя
   *
   * REQ-AUTH-60: IP Whitelist для админов
   *
   * @param userId - ID пользователя
   * @param updateIpWhitelistDto - Настройки IP Whitelist
   * @returns Обновленный пользователь
   * @throws NotFoundException если пользователь не найден
   * @throws BadRequestException если IP Whitelist включен, но список IP пуст
   */
  async updateIpWhitelist(
    userId: string,
    updateIpWhitelistDto: UpdateIpWhitelistDto,
  ): Promise<UserResponseDto> {
    const user = await this.findOneEntity(userId);

    // Валидация: если IP Whitelist включен, должен быть хотя бы один IP
    if (
      updateIpWhitelistDto.ip_whitelist_enabled &&
      (!updateIpWhitelistDto.allowed_ips || updateIpWhitelistDto.allowed_ips.length === 0)
    ) {
      throw new BadRequestException(
        'При включенном IP Whitelist необходимо указать хотя бы один IP адрес',
      );
    }

    // Обновление полей
    user.ip_whitelist_enabled = updateIpWhitelistDto.ip_whitelist_enabled;
    user.allowed_ips = updateIpWhitelistDto.allowed_ips || null;

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Find user with RBAC roles
   * Used by RbacRolesGuard for permission checking
   */
  async findOneWithRoles(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    return user;
  }

  /**
   * Block user account
   * REQ-AUTH-34: SuperAdmin/Admin должны иметь возможность временно блокировать учётную запись
   */
  async blockUser(
    userId: string,
    reason?: string,
    durationMinutes?: number,
  ): Promise<UserResponseDto> {
    const user = await this.findOneEntity(userId);

    // Set status to SUSPENDED
    user.status = UserStatus.SUSPENDED;

    // Set lock duration if specified
    if (durationMinutes) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);
      user.account_locked_until = lockUntil;
    }

    // Invalidate refresh token to force re-login
    user.refresh_token = null;

    // Save reason in settings
    if (reason) {
      user.settings = {
        ...user.settings,
        block_reason: reason,
        blocked_at: new Date().toISOString(),
      };
    }

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Unblock user account
   * REQ-AUTH-35: При блокировке все активные сессии аннулируются, вход невозможен до разблокировки
   */
  async unblockUser(userId: string): Promise<UserResponseDto> {
    const user = await this.findOneEntity(userId);

    // Reset status to ACTIVE
    user.status = UserStatus.ACTIVE;

    // Clear lock timestamp
    user.account_locked_until = null;

    // Clear failed login attempts
    user.failed_login_attempts = 0;
    user.last_failed_login_at = null;

    // Clear block reason from settings
    if (user.settings?.block_reason) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { block_reason, blocked_at, ...otherSettings } = user.settings;
      user.settings = otherSettings;
    }

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Deactivate user account (soft disable)
   * REQ-AUTH-34: Деактивировать учётную запись (без физического удаления истории)
   */
  async deactivateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.findOneEntity(userId);

    // Set status to INACTIVE
    user.status = UserStatus.INACTIVE;

    // Invalidate refresh token
    user.refresh_token = null;

    // Mark deactivation in settings
    user.settings = {
      ...user.settings,
      deactivated_at: new Date().toISOString(),
    };

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.findOneEntity(userId);

    // Set status to ACTIVE
    user.status = UserStatus.ACTIVE;

    // Clear deactivation timestamp
    if (user.settings?.deactivated_at) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deactivated_at, ...otherSettings } = user.settings;
      user.settings = otherSettings;
    }

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  /**
   * Get users with PENDING status
   * For admin approval workflow
   */
  async getPendingUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { status: UserStatus.PENDING },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Create a PENDING user from Telegram data
   * Used for simplified registration via Telegram bot
   *
   * @param telegramData - Data from Telegram user
   * @returns Created user with PENDING status
   * @throws ConflictException if user already exists
   */
  async createPendingFromTelegram(telegramData: {
    telegram_id: string;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByTelegramId(telegramData.telegram_id);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким Telegram ID уже существует');
    }

    // Build full name from Telegram data
    const parts: string[] = [];
    if (telegramData.telegram_first_name) {
      parts.push(telegramData.telegram_first_name);
    }
    if (telegramData.telegram_last_name) {
      parts.push(telegramData.telegram_last_name);
    }
    let full_name: string;
    if (parts.length > 0) {
      full_name = parts.join(' ');
    } else if (telegramData.telegram_username) {
      full_name = `@${telegramData.telegram_username}`;
    } else {
      full_name = `Telegram User ${telegramData.telegram_id}`;
    }

    // Create pending user (no password or role yet - will be set on approval)
    const user = this.userRepository.create({
      full_name,
      email: `telegram_${telegramData.telegram_id}@vendhub.temp`,
      telegram_user_id: telegramData.telegram_id,
      telegram_username: telegramData.telegram_username || null,
      status: UserStatus.PENDING,
      role: UserRole.VIEWER, // Temporary role, will be set by admin on approval
    });

    return await this.userRepository.save(user);
  }

  /**
   * Approve pending user and generate credentials
   *
   * @param userId - User ID to approve
   * @param approveUserDto - Approval data (role)
   * @param adminId - Admin who approves
   * @returns Approved user with credentials
   */
  async approveUser(
    userId: string,
    approveUserDto: ApproveUserDto,
    adminId: string,
  ): Promise<{ user: User; credentials: { username: string; password: string } }> {
    const user = await this.findOneEntity(userId);

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('Only pending users can be approved');
    }

    // Generate username and temporary password
    const username = await this.usernameGeneratorService.generateUsername(user.full_name);
    const tempPassword = this.passwordGeneratorService.generatePassword();

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    // Update user
    user.username = username;
    user.password_hash = password_hash;
    user.role = approveUserDto.role;
    user.status = UserStatus.ACTIVE;
    user.requires_password_change = true;
    user.approved_by_id = adminId;
    user.approved_at = new Date();

    const savedUser = await this.userRepository.save(user);

    return {
      user: savedUser,
      credentials: {
        username,
        password: tempPassword,
      },
    };
  }

  /**
   * Reject pending user
   *
   * @param userId - User ID to reject
   * @param reason - Rejection reason
   * @param adminId - Admin who rejects
   * @returns Rejected user
   */
  async rejectUser(userId: string, reason: string, adminId: string): Promise<User> {
    const user = await this.findOneEntity(userId);

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('Only pending users can be rejected');
    }

    user.status = UserStatus.REJECTED;
    user.rejection_reason = reason;
    user.rejected_by_id = adminId;
    user.rejected_at = new Date();

    return this.userRepository.save(user);
  }

  /**
   * Find users by role
   * Used to get users for notifications (admin, manager, etc.)
   *
   * @param role - User role to filter by
   * @param activeOnly - Only return active users (default: true)
   * @returns Array of users with the specified role
   */
  async findByRole(role: UserRole, activeOnly: boolean = true): Promise<User[]> {
    const whereCondition: FindOptionsWhere<User> = { role };

    if (activeOnly) {
      whereCondition.status = UserStatus.ACTIVE;
    }

    return this.userRepository.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find users by multiple roles
   * Used to get admins and managers for notifications
   *
   * @param roles - Array of user roles to filter by
   * @param activeOnly - Only return active users (default: true)
   * @returns Array of users with any of the specified roles
   */
  async findByRoles(roles: UserRole[], activeOnly: boolean = true): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user').whereInIds([]);

    if (roles.length > 0) {
      query.where('user.role IN (:...roles)', { roles });
    }

    if (activeOnly) {
      query.andWhere('user.status = :status', { status: UserStatus.ACTIVE });
    }

    return query.orderBy('user.created_at', 'DESC').getMany();
  }

  /**
   * Get admin user IDs for notifications
   * Returns IDs of all active SuperAdmin and Admin users
   *
   * @returns Array of admin user IDs
   */
  async getAdminUserIds(): Promise<string[]> {
    const admins = await this.findByRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    return admins.map((user) => user.id);
  }

  /**
   * Get manager user IDs for notifications
   * Returns IDs of all active Manager users
   *
   * @returns Array of manager user IDs
   */
  async getManagerUserIds(): Promise<string[]> {
    const managers = await this.findByRole(UserRole.MANAGER);
    return managers.map((user) => user.id);
  }

  /**
   * Get first admin user ID for fallback notifications
   * Used when a specific admin ID is not configured
   *
   * @returns First admin user ID or null
   */
  async getFirstAdminId(): Promise<string | null> {
    const admins = await this.findByRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    return admins.length > 0 ? admins[0].id : null;
  }
}
