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
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import {
  CreateRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  SendToSupplierDto,
  CompleteRequestDto,
  UpdateReceivedQuantityDto,
} from './dto';
import { RequestStatus, RequestPriority } from './entities/request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать заявку на материалы' })
  create(@Req() req: ExpressRequest & { user: { id: string } }, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все заявки' })
  @ApiQuery({ name: 'status', required: false, enum: RequestStatus })
  @ApiQuery({ name: 'priority', required: false, enum: RequestPriority })
  @ApiQuery({ name: 'created_by_user_id', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('status') status?: RequestStatus,
    @Query('priority') priority?: RequestPriority,
    @Query('created_by_user_id') created_by_user_id?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.requestsService.findAll({
      status,
      priority,
      created_by_user_id,
      date_from: date_from ? new Date(date_from) : undefined,
      date_to: date_to ? new Date(date_to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Получить мои заявки' })
  @ApiQuery({ name: 'status', required: false, enum: RequestStatus })
  findMy(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Query('status') status?: RequestStatus,
  ) {
    return this.requestsService.findAll({
      created_by_user_id: req.user.id,
      status,
    });
  }

  @Get('statistics')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Получить статистику заявок' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  getStatistics(@Query('date_from') date_from?: string, @Query('date_to') date_to?: string) {
    return this.requestsService.getStatistics({
      date_from: date_from ? new Date(date_from) : undefined,
      date_to: date_to ? new Date(date_to) : undefined,
    });
  }

  @Get('by-number/:number')
  @ApiOperation({ summary: 'Получить заявку по номеру' })
  @ApiParam({ name: 'number', type: String })
  findByNumber(@Param('number') number: string) {
    return this.requestsService.findByNumber(number);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заявку по ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить заявку' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRequestDto) {
    return this.requestsService.update(id, dto);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Одобрить заявку' })
  @ApiParam({ name: 'id', type: String })
  approve(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRequestDto,
  ) {
    return this.requestsService.approve(id, req.user.id, dto);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Отклонить заявку' })
  @ApiParam({ name: 'id', type: String })
  reject(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.requestsService.reject(id, req.user.id, dto);
  }

  @Post(':id/send')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiOperation({ summary: 'Отметить как отправленную поставщику' })
  @ApiParam({ name: 'id', type: String })
  markAsSent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendToSupplierDto) {
    return this.requestsService.markAsSent(id, dto);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiOperation({ summary: 'Завершить заявку' })
  @ApiParam({ name: 'id', type: String })
  complete(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteRequestDto,
  ) {
    return this.requestsService.complete(id, req.user.id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить заявку' })
  @ApiParam({ name: 'id', type: String })
  cancel(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requestsService.cancel(id, req.user.id);
  }

  @Patch('items/:itemId/received')
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiOperation({ summary: 'Обновить полученное количество позиции' })
  @ApiParam({ name: 'itemId', type: String })
  updateReceivedQuantity(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateReceivedQuantityDto,
  ) {
    return this.requestsService.updateReceivedQuantity(itemId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить заявку (только новые)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.remove(id);
  }
}
