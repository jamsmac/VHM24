import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ComplaintsService } from './complaints.service';
import { Complaint, ComplaintStatus, ComplaintType } from './entities/complaint.entity';
import {
  CreateComplaintDto,
  CreatePublicComplaintDto,
  HandleComplaintDto,
} from './dto/create-complaint.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Complaints')
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 complaints per minute from one IP
  @ApiOperation({
    summary: 'Создать жалобу (публичный endpoint, доступен без авторизации)',
  })
  @ApiResponse({
    status: 201,
    description: 'Жалоба создана',
    type: Complaint,
  })
  create(@Body() dto: CreateComplaintDto): Promise<Complaint> {
    return this.complaintsService.create(dto);
  }

  @Post('public/qr')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 complaints per minute from one IP
  @ApiOperation({
    summary: 'Создать жалобу через QR-код (публичный endpoint, доступен без авторизации)',
    description: 'Используется для подачи жалоб через QR-код на аппарате. Не требует авторизации.',
  })
  @ApiResponse({
    status: 201,
    description: 'Жалоба создана',
    type: Complaint,
  })
  @ApiResponse({
    status: 404,
    description: 'Аппарат с указанным QR-кодом не найден',
  })
  createFromQrCode(@Body() dto: CreatePublicComplaintDto): Promise<Complaint> {
    return this.complaintsService.createFromQrCode(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить список жалоб с фильтрацией' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ComplaintStatus,
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ComplaintType,
    description: 'Фильтр по типу',
  })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiResponse({
    status: 200,
    description: 'Список жалоб',
    type: [Complaint],
  })
  findAll(
    @Query('status') status?: ComplaintStatus,
    @Query('type') type?: ComplaintType,
    @Query('machineId') machineId?: string,
  ): Promise<Complaint[]> {
    return this.complaintsService.findAll(status, type, machineId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить статистику жалоб' })
  @ApiResponse({
    status: 200,
    description: 'Статистика жалоб',
  })
  getStats() {
    return this.complaintsService.getStats();
  }

  @Get('new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить новые жалобы (требуют внимания)' })
  @ApiResponse({
    status: 200,
    description: 'Список новых жалоб',
    type: [Complaint],
  })
  getNewComplaints(): Promise<Complaint[]> {
    return this.complaintsService.getNewComplaints();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить жалобу по ID' })
  @ApiParam({ name: 'id', description: 'UUID жалобы' })
  @ApiResponse({
    status: 200,
    description: 'Данные жалобы',
    type: Complaint,
  })
  @ApiResponse({ status: 404, description: 'Жалоба не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Complaint> {
    return this.complaintsService.findOne(id);
  }

  @Post(':id/take')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Взять жалобу в обработку' })
  @ApiParam({ name: 'id', description: 'UUID жалобы' })
  @ApiResponse({
    status: 200,
    description: 'Жалоба взята в обработку',
    type: Complaint,
  })
  takeInReview(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<Complaint> {
    const userId = req.user.id;
    return this.complaintsService.takeInReview(id, userId);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Решить жалобу' })
  @ApiParam({ name: 'id', description: 'UUID жалобы' })
  @ApiResponse({
    status: 200,
    description: 'Жалоба решена',
    type: Complaint,
  })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandleComplaintDto,
    @Request() req: any,
  ): Promise<Complaint> {
    const userId = req.user.id;
    return this.complaintsService.resolve(id, userId, dto);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Отклонить жалобу' })
  @ApiParam({ name: 'id', description: 'UUID жалобы' })
  @ApiResponse({
    status: 200,
    description: 'Жалоба отклонена',
    type: Complaint,
  })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<Complaint> {
    const userId = req.user.id;
    return this.complaintsService.reject(id, userId, reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить жалобу (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID жалобы' })
  @ApiResponse({ status: 204, description: 'Жалоба удалена' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.complaintsService.remove(id);
  }
}
