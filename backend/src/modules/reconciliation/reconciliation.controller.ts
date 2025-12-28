import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { CreateReconciliationRunDto, ResolveMismatchDto } from './dto';
import { ReconciliationStatus } from './entities/reconciliation-run.entity';
import { MismatchType } from './entities/reconciliation-mismatch.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('reconciliation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('runs')
  @ApiOperation({ summary: 'Создать и запустить сверку' })
  create(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Body() dto: CreateReconciliationRunDto,
  ) {
    return this.reconciliationService.createAndRun(req.user.id, dto);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Получить все прогоны сверки' })
  @ApiQuery({ name: 'status', required: false, enum: ReconciliationStatus })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('status') status?: ReconciliationStatus,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reconciliationService.findAll({
      status,
      date_from: date_from ? new Date(date_from) : undefined,
      date_to: date_to ? new Date(date_to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Получить прогон сверки по ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.findOne(id);
  }

  @Get('runs/:id/mismatches')
  @ApiOperation({ summary: 'Получить несовпадения прогона' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'mismatch_type', required: false, enum: MismatchType })
  @ApiQuery({ name: 'is_resolved', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getMismatches(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('mismatch_type') mismatch_type?: MismatchType,
    @Query('is_resolved') is_resolved?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reconciliationService.getMismatches(id, {
      mismatch_type,
      is_resolved: is_resolved !== undefined ? is_resolved === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('mismatches/:mismatchId/resolve')
  @ApiOperation({ summary: 'Разрешить несовпадение' })
  @ApiParam({ name: 'mismatchId', type: String })
  resolveMismatch(
    @Req() req: ExpressRequest & { user: { id: string } },
    @Param('mismatchId', ParseUUIDPipe) mismatchId: string,
    @Body() dto: ResolveMismatchDto,
  ) {
    return this.reconciliationService.resolveMismatch(mismatchId, req.user.id, dto);
  }

  @Post('runs/:id/cancel')
  @ApiOperation({ summary: 'Отменить прогон сверки' })
  @ApiParam({ name: 'id', type: String })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.cancel(id);
  }

  @Delete('runs/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Удалить прогон сверки' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.remove(id);
  }
}
