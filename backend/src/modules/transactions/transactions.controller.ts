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
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    userId: string;
  };
}
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Transaction, TransactionType } from './entities/transaction.entity';
import {
  CreateTransactionDto,
  RecordSaleDto,
  RecordCollectionDto,
  RecordExpenseDto,
} from './dto/create-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Создать транзакцию' })
  @ApiResponse({
    status: 201,
    description: 'Транзакция создана',
    type: Transaction,
  })
  create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.transactionsService.create(dto);
  }

  @Post('sale')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Зарегистрировать продажу' })
  @ApiResponse({
    status: 201,
    description: 'Продажа зарегистрирована',
    type: Transaction,
  })
  recordSale(@Body() dto: RecordSaleDto): Promise<Transaction> {
    return this.transactionsService.recordSale(dto);
  }

  @Post('collection')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Зарегистрировать инкассацию' })
  @ApiResponse({
    status: 201,
    description: 'Инкассация зарегистрирована',
    type: Transaction,
  })
  recordCollection(@Body() dto: RecordCollectionDto): Promise<Transaction> {
    return this.transactionsService.recordCollection(dto);
  }

  @Post('expense')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Зарегистрировать расход' })
  @ApiResponse({
    status: 201,
    description: 'Расход зарегистрирован',
    type: Transaction,
  })
  recordExpense(@Body() dto: RecordExpenseDto): Promise<Transaction> {
    return this.transactionsService.recordExpense(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список транзакций с фильтрацией' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TransactionType,
    description: 'Фильтр по типу',
  })
  @ApiQuery({
    name: 'machineId',
    required: false,
    type: String,
    description: 'Фильтр по аппарату',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Фильтр по пользователю',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список транзакций',
    type: [Transaction],
  })
  findAll(
    @Query('type') type?: TransactionType,
    @Query('machineId') machineId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<Transaction[]> {
    return this.transactionsService.findAll(type, machineId, userId, dateFrom, dateTo);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить общую статистику транзакций' })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика транзакций',
  })
  getStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.transactionsService.getStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get('daily-revenue')
  @ApiOperation({ summary: 'Получить ежедневную выручку (для графиков)' })
  @ApiQuery({ name: 'dateFrom', type: String, description: 'Начальная дата' })
  @ApiQuery({ name: 'dateTo', type: String, description: 'Конечная дата' })
  @ApiResponse({
    status: 200,
    description: 'Ежедневная выручка',
  })
  getDailyRevenue(@Query('dateFrom') dateFrom: string, @Query('dateTo') dateTo: string) {
    return this.transactionsService.getDailyRevenue(new Date(dateFrom), new Date(dateTo));
  }

  @Get('top-recipes')
  @ApiOperation({ summary: 'Получить топ продаваемых рецептов' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество рецептов',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Топ рецептов',
  })
  getTopRecipes(@Query('limit') limit?: number) {
    return this.transactionsService.getTopRecipes(limit ? +limit : 10);
  }

  @Get('machine/:machineId/stats')
  @ApiOperation({ summary: 'Получить статистику по аппарату' })
  @ApiParam({ name: 'machineId', description: 'UUID аппарата' })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Начальная дата',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Конечная дата',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика аппарата',
  })
  getMachineStats(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.transactionsService.getMachineStats(
      machineId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить транзакцию по ID' })
  @ApiParam({ name: 'id', description: 'UUID транзакции' })
  @ApiResponse({
    status: 200,
    description: 'Данные транзакции',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Транзакция не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Transaction> {
    return this.transactionsService.findOne(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить транзакцию (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID транзакции' })
  @ApiResponse({ status: 204, description: 'Транзакция удалена' })
  @ApiResponse({ status: 404, description: 'Транзакция не найдена' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return this.transactionsService.remove(id, req.user?.userId);
  }
}
