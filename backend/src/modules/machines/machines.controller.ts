import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { MachinesService } from './machines.service';
import { QrCodeService } from './qr-code.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { WriteoffMachineDto } from './dto/writeoff-machine.dto';
import { WriteoffJobResponseDto, WriteoffJobStatusDto } from './dto/writeoff-job-status.dto';
import { BulkWriteoffResponseDto } from './dto/bulk-writeoff-response.dto';
import { Machine, MachineStatus } from './entities/machine.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
// import { MoveMachineDto } from './dto/move-machine.dto';
import { MachineLocationHistory } from './entities/machine-location-history.entity';

@ApiTags('Machines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('machines')
export class MachinesController {
  constructor(
    private readonly machinesService: MachinesService,
    private readonly qrCodeService: QrCodeService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать новый аппарат' })
  @ApiResponse({
    status: 201,
    description: 'Аппарат успешно создан',
    type: Machine,
  })
  @ApiResponse({
    status: 409,
    description: 'Аппарат с таким номером или QR-кодом уже существует',
  })
  create(@Body() createMachineDto: CreateMachineDto): Promise<Machine> {
    return this.machinesService.create(createMachineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех аппаратов' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MachineStatus,
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    type: String,
    description: 'Фильтр по локации',
  })
  @ApiResponse({
    status: 200,
    description: 'Список аппаратов',
    type: [Machine],
  })
  findAll(
    @Query('status') status?: MachineStatus,
    @Query('locationId') locationId?: string,
  ): Promise<Machine[]> {
    return this.machinesService.findAll({
      status,
      location_id: locationId,
    });
  }

  // @Get('stats')
  // @ApiOperation({ summary: 'Получить статистику по аппаратам' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Статистика аппаратов',
  // })
  // getStats() {
  //   // TODO: Implement getStats method
  //   return { message: 'Not implemented yet' };
  // }

  @Get('by-number/:machine_number')
  @ApiOperation({ summary: 'Получить аппарат по номеру' })
  @ApiParam({ name: 'machine_number', description: 'Номер аппарата', example: 'M-001' })
  @ApiResponse({
    status: 200,
    description: 'Данные аппарата',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  findByNumber(@Param('machine_number') machine_number: string): Promise<Machine> {
    return this.machinesService.findByMachineNumber(machine_number);
  }

  @Get('by-qr/:qr_code')
  @ApiOperation({ summary: 'Получить аппарат по QR-коду' })
  @ApiParam({ name: 'qr_code', description: 'QR-код аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Данные аппарата',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  findByQRCode(@Param('qr_code') qr_code: string): Promise<Machine> {
    return this.machinesService.findByQrCode(qr_code);
  }

  @Get('by-location/:locationId')
  @ApiOperation({ summary: 'Получить аппараты по локации' })
  @ApiParam({ name: 'locationId', description: 'UUID локации' })
  @ApiResponse({
    status: 200,
    description: 'Список аппаратов в локации',
    type: [Machine],
  })
  findByLocation(@Param('locationId', ParseUUIDPipe) locationId: string): Promise<Machine[]> {
    return this.machinesService.findAll({ location_id: locationId });
  }

  // @Get('by-operator/:operatorId')
  // @ApiOperation({ summary: 'Получить аппараты оператора' })
  // @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Список аппаратов оператора',
  //   type: [Machine],
  // })
  // findByOperator(@Param('operatorId') operatorId: string): Promise<Machine[]> {
  //   // TODO: Implement findByOperator - needs relation with operators
  //   return Promise.resolve([]);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Получить аппарат по ID' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Данные аппарата',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Machine> {
    return this.machinesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить аппарат' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Аппарат успешно обновлен',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMachineDto: UpdateMachineDto,
  ): Promise<Machine> {
    return this.machinesService.update(id, updateMachineDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить статус аппарата' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'Статус успешно обновлен',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: MachineStatus,
  ): Promise<Machine> {
    return this.machinesService.update(id, { status });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Удалить аппарат (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({ status: 204, description: 'Аппарат успешно удален' })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.machinesService.remove(id);
  }

  // ========== Equipment Writeoff Endpoints (Background Processing) ==========

  @Post(':id/writeoff')
  @HttpCode(HttpStatus.ACCEPTED) // 202 - Accepted for processing
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Списать аппарат (асинхронная обработка)',
    description:
      'Отправляет аппарат на списание в фоновую очередь обработки. ' +
      'Рассчитывает остаточную балансовую стоимость (первоначальная стоимость - накопленная амортизация) ' +
      'и создает транзакцию списания. Аппарат переводится в статус DISABLED. ' +
      'Возвращает ID задачи для отслеживания статуса выполнения.',
  })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 202,
    description: 'Операция списания добавлена в очередь обработки',
    type: WriteoffJobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные или аппарат уже списан' })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  writeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() writeoffDto: WriteoffMachineDto,
    @CurrentUser() user: User,
  ): Promise<WriteoffJobResponseDto> {
    return this.machinesService.writeOffMachine(id, writeoffDto, user?.id);
  }

  @Post('writeoff/bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Массовое списание аппаратов',
    description:
      'Отправляет несколько аппаратов на списание в фоновую очередь. ' +
      'Каждый аппарат обрабатывается отдельной задачей. ' +
      'Возвращает сводку по количеству успешно поставленных в очередь и неудачных попыток.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['machineIds', 'writeoffData'],
      properties: {
        machineIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Массив UUID аппаратов для списания',
          example: ['uuid-1', 'uuid-2', 'uuid-3'],
        },
        writeoffData: {
          type: 'object',
          properties: {
            disposal_reason: {
              type: 'string',
              description: 'Причина списания для всех аппаратов',
              example: 'Плановая замена устаревшего оборудования',
            },
            disposal_date: {
              type: 'string',
              format: 'date',
              description: 'Дата списания',
              example: '2025-11-16',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Массовое списание инициировано',
    type: BulkWriteoffResponseDto,
  })
  bulkWriteOff(
    @Body('machineIds') machineIds: string[],
    @Body('writeoffData') writeoffDto: WriteoffMachineDto,
    @CurrentUser() user: User,
  ): Promise<BulkWriteoffResponseDto> {
    return this.machinesService.bulkWriteOffMachines(machineIds, writeoffDto, user?.id);
  }

  @Get('writeoff/job/:jobId')
  @ApiOperation({
    summary: 'Получить статус задачи списания',
    description:
      'Возвращает текущий статус задачи списания: pending, processing, completed или failed. ' +
      'Также включает процент выполнения, сообщения об ошибках и результат.',
  })
  @ApiParam({ name: 'jobId', description: 'ID задачи списания (writeoff-XXX)' })
  @ApiResponse({
    status: 200,
    description: 'Статус задачи списания',
    type: WriteoffJobStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  getWriteoffJobStatus(@Param('jobId') jobId: string): Promise<WriteoffJobStatusDto> {
    return this.machinesService.getWriteoffJobStatus(jobId);
  }

  @Delete('writeoff/job/:jobId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Отменить задачу списания',
    description: 'Отменяет задачу списания, если она еще не начала выполняться.',
  })
  @ApiParam({ name: 'jobId', description: 'ID задачи списания (writeoff-XXX)' })
  @ApiResponse({
    status: 200,
    description: 'Задача успешно отменена',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Невозможно отменить активную или завершенную задачу' })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  cancelWriteoffJob(@Param('jobId') jobId: string): Promise<{ success: boolean; message: string }> {
    return this.machinesService.cancelWriteoffJob(jobId);
  }

  @Get('writeoff/jobs')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить список задач списания',
    description: 'Возвращает список всех задач списания с возможностью фильтрации по статусу.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['completed', 'failed', 'active', 'waiting'],
    description: 'Фильтр по статусу задач',
  })
  @ApiResponse({
    status: 200,
    description: 'Список задач списания',
  })
  async getWriteoffJobs(@Query('status') status?: 'completed' | 'failed' | 'active' | 'waiting') {
    const jobs = await this.machinesService.getWriteoffJobs(status);
    return jobs.map((job) => ({
      id: `writeoff-${job.id}`,
      status: job.progress() ? 'processing' : 'pending',
      progress: job.progress() as number,
      data: job.data,
      createdAt: new Date(job.timestamp),
      attempts: job.attemptsMade,
    }));
  }

  // ========== Location History Endpoints (REQ-MD-MACH-02) ==========

  // @Post(':id/move')
  // @HttpCode(HttpStatus.OK)
  // @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  // @ApiOperation({
  //   summary: 'Переместить аппарат в новую локацию',
  //   description:
  //     'Перемещает аппарат в новую локацию и создает запись в истории перемещений. ' +
  //     'REQ-MD-MACH-02: История перемещений аппаратов между локациями',
  // })
  // @ApiParam({ name: 'id', description: 'UUID аппарата' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Аппарат успешно перемещен',
  //   type: Machine,
  // })
  // @ApiResponse({ status: 400, description: 'Некорректные данные или аппарат уже в этой локации' })
  // @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  // moveToLocation(
  //   @Param('id') id: string,
  //   @Body() moveMachineDto: MoveMachineDto,
  //   @CurrentUser() user: User,
  // ): Promise<Machine> {
  //   // TODO: Implement moveMachine method
  //   return this.machinesService.update(id, { location_id: moveMachineDto.location_id });
  // }

  @Get(':id/location-history')
  @ApiOperation({
    summary: 'Получить историю перемещений аппарата',
    description: 'REQ-MD-MACH-02: История перемещений аппаратов между локациями',
  })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'История перемещений аппарата',
    type: [MachineLocationHistory],
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  getLocationHistory(@Param('id', ParseUUIDPipe) id: string): Promise<MachineLocationHistory[]> {
    return this.machinesService.getLocationHistory(id);
  }

  // ========== QR Code & Connectivity Endpoints ==========

  // @Post(':id/ping')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Зарегистрировать пинг от аппарата (обновить статус онлайн)' })
  // @ApiParam({ name: 'id', description: 'UUID аппарата' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Пинг зарегистрирован, статус обновлен',
  //   type: Machine,
  // })
  // @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  // recordPing(@Param('id') id: string): Promise<Machine> {
  //   // TODO: Implement recordPing method
  //   return this.machinesService.update(id, {
  //     last_ping_at: new Date(),
  //     is_online: true
  //   });
  // }

  @Get('connectivity/status')
  @ApiOperation({ summary: 'Получить статус подключения всех аппаратов' })
  @ApiResponse({
    status: 200,
    description: 'Статистика подключения аппаратов',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        online: { type: 'number' },
        offline: { type: 'number' },
      },
    },
  })
  async getConnectivityStatus() {
    const stats = await this.machinesService.updateOnlineStatus();
    return {
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
    };
  }

  @Get(':id/qr-code')
  @ApiOperation({ summary: 'Получить QR-код аппарата (изображение PNG)' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'QR-код в формате base64 data URL',
    schema: {
      type: 'object',
      properties: {
        qr_code: { type: 'string' },
        qr_code_url: { type: 'string' },
        image: { type: 'string', description: 'Base64 data URL' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  async getQrCode(@Param('id', ParseUUIDPipe) id: string) {
    const machine = await this.machinesService.findOne(id);
    const imageDataUrl = await this.qrCodeService.generateQrCodeImage(id);

    return {
      qr_code: machine.qr_code,
      qr_code_url: machine.qr_code_url,
      image: imageDataUrl,
    };
  }

  @Get(':id/qr-code/download')
  @ApiOperation({ summary: 'Скачать QR-код как PNG файл' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'QR-код PNG изображение',
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  async downloadQrCode(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const machine = await this.machinesService.findOne(id);
    const buffer = await this.qrCodeService.generateQrCodeBuffer(id);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=qr-code-${machine.machine_number}.png`,
    );
    res.send(buffer);
  }

  @Post(':id/qr-code/regenerate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Перегенерировать QR-код для аппарата' })
  @ApiParam({ name: 'id', description: 'UUID аппарата' })
  @ApiResponse({
    status: 200,
    description: 'QR-код успешно перегенерирован',
    type: Machine,
  })
  @ApiResponse({ status: 404, description: 'Аппарат не найден' })
  regenerateQrCode(@Param('id', ParseUUIDPipe) id: string): Promise<Machine> {
    return this.qrCodeService.regenerateQrCode(id);
  }
}
