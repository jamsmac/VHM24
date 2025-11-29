import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateIpWhitelistDto } from './dto/update-ip-whitelist.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { RejectUserDto } from './dto/reject-user.dto';
import { UserResponseDto, UserListItemDto } from './dto/user-response.dto';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email или телефон уже существует' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    type: [UserListItemDto],
  })
  findAll(): Promise<UserListItemDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно обновлен',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 409, description: 'Email или телефон уже существует' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Get('pending/approvals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить список пользователей в ожидании одобрения' })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей со статусом PENDING',
    type: [User],
  })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  getPendingApprovals(): Promise<User[]> {
    return this.usersService.getPendingUsers();
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Одобрить пользователя и сгенерировать учетные данные' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь одобрен, учетные данные сгенерированы',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Пользователь не имеет статус PENDING' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  approveUser(
    @Param('id') userId: string,
    @Body() approveUserDto: ApproveUserDto,
    @CurrentUser() admin: User,
  ): Promise<{ user: User; credentials: { username: string; password: string } }> {
    return this.usersService.approveUser(userId, approveUserDto, admin.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отклонить заявку пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь отклонен',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 400, description: 'Пользователь не имеет статус PENDING' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  rejectUser(
    @Param('id') userId: string,
    @Body() rejectUserDto: RejectUserDto,
    @CurrentUser() admin: User,
  ): Promise<User> {
    return this.usersService.rejectUser(userId, rejectUserDto.reason, admin.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пользователя (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({ status: 204, description: 'Пользователь успешно удален' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Patch(':id/ip-whitelist')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить настройки IP Whitelist для пользователя' })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'IP Whitelist настройки успешно обновлены',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные (например, IP Whitelist включен, но список IP пуст)',
  })
  updateIpWhitelist(
    @Param('id') id: string,
    @Body() updateIpWhitelistDto: UpdateIpWhitelistDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateIpWhitelist(id, updateIpWhitelistDto);
  }

  /**
   * Block user account
   * REQ-AUTH-34: SuperAdmin/Admin должны иметь возможность временно блокировать учётную запись
   */
  @Patch(':id/block')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Заблокировать учетную запись пользователя',
    description:
      'Блокирует учетную запись пользователя, отзывает все активные сессии. REQ-AUTH-34, REQ-AUTH-35',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно заблокирован',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param('id') id: string,
    @Body() blockUserDto: BlockUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.blockUser(id, blockUserDto.reason, blockUserDto.durationMinutes);
  }

  /**
   * Unblock user account
   * REQ-AUTH-35: При блокировке все активные сессии аннулируются, вход невозможен до разблокировки
   */
  @Patch(':id/unblock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Разблокировать учетную запись пользователя',
    description:
      'Снимает блокировку с учетной записи, сбрасывает счетчик неудачных попыток входа. REQ-AUTH-35',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно разблокирован',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @HttpCode(HttpStatus.OK)
  async unblockUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.unblockUser(id);
  }

  /**
   * Deactivate user account (soft disable)
   * REQ-AUTH-34: Деактивировать учётную запись (без физического удаления истории)
   */
  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Деактивировать учетную запись пользователя',
    description:
      'Деактивирует учетную запись без удаления истории, отзывает все токены. REQ-AUTH-34',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно деактивирован',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.deactivateUser(id);
  }

  /**
   * Activate user account
   */
  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Активировать учетную запись пользователя',
    description: 'Активирует ранее деактивированную учетную запись',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно активирован',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.activateUser(id);
  }
}
