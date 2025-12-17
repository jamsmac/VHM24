import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
  };
}
import { OpeningBalancesService } from './opening-balances.service';
import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import { UpdateOpeningBalanceDto } from './dto/update-opening-balance.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';

@ApiTags('Opening Balances')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('opening-balances')
export class OpeningBalancesController {
  constructor(private readonly balancesService: OpeningBalancesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать начальный остаток' })
  @ApiResponse({ status: 201, description: 'Остаток успешно создан' })
  create(@Body() dto: CreateOpeningBalanceDto) {
    return this.balancesService.create(dto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Массовое создание начальных остатков',
    description:
      'REQ-STK-OPEN-01: Создать начальные остатки для нескольких номенклатур за один запрос. ' +
      'Полезно для ввода начальных данных через UI форму.',
  })
  @ApiResponse({
    status: 201,
    description: 'Остатки успешно созданы',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number' },
        failed: { type: 'number' },
        errors: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async bulkCreate(@Body() dto: { balances: CreateOpeningBalanceDto[] }) {
    return this.balancesService.bulkCreate(dto.balances);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список начальных остатков' })
  @ApiQuery({ name: 'warehouse_id', required: false, description: 'ID склада' })
  @ApiQuery({ name: 'balance_date', required: false, description: 'Дата остатка' })
  @ApiQuery({ name: 'is_applied', required: false, type: Boolean, description: 'Применен ли' })
  @ApiQuery({ name: 'nomenclature_id', required: false, description: 'ID номенклатуры' })
  findAll(
    @Query('warehouse_id') warehouse_id?: string,
    @Query('balance_date') balance_date?: string,
    @Query('is_applied') is_applied?: string,
    @Query('nomenclature_id') nomenclature_id?: string,
  ) {
    const filters = {
      warehouse_id,
      balance_date,
      is_applied: is_applied === 'true' ? true : is_applied === 'false' ? false : undefined,
      nomenclature_id,
    };
    return this.balancesService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по начальным остаткам' })
  @ApiQuery({ name: 'warehouse_id', required: false, description: 'ID склада' })
  getStats(@Query('warehouse_id') warehouse_id?: string) {
    return this.balancesService.getStats(warehouse_id);
  }

  @Post('apply')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Применить начальные остатки к текущему инвентарю' })
  @ApiResponse({ status: 200, description: 'Остатки успешно применены' })
  async applyBalances(
    @Body() body: { balance_date: string; warehouse_id: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.balancesService.applyBalances(body.balance_date, body.warehouse_id, userId);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Импортировать начальные остатки' })
  @ApiResponse({ status: 201, description: 'Остатки успешно импортированы' })
  async importBalances(@Body() body: { data: CreateOpeningBalanceDto[]; session_id: string }) {
    return this.balancesService.importBalances(body.data, body.session_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить начальный остаток по ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.balancesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить начальный остаток' })
  @ApiResponse({ status: 200, description: 'Остаток успешно обновлен' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOpeningBalanceDto) {
    return this.balancesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить начальный остаток' })
  @ApiResponse({ status: 204, description: 'Остаток успешно удален' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.balancesService.remove(id);
  }
}
