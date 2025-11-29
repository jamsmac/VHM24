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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { SparePartsService } from '../services/spare-parts.service';
import { SparePart } from '../entities/spare-part.entity';
import { ComponentType } from '../entities/equipment-component.entity';
import { CreateSparePartDto, UpdateSparePartDto, AdjustStockDto } from '../dto/spare-part.dto';

@ApiTags('Equipment - Spare Parts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment/spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Создать запасную часть' })
  @ApiResponse({
    status: 201,
    description: 'Запасная часть создана',
    type: SparePart,
  })
  create(@Body() dto: CreateSparePartDto): Promise<SparePart> {
    return this.sparePartsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список запасных частей' })
  @ApiQuery({ name: 'componentType', enum: ComponentType, required: false })
  @ApiQuery({ name: 'lowStock', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'Список запасных частей',
    type: [SparePart],
  })
  findAll(
    @Query('componentType') componentType?: ComponentType,
    @Query('lowStock') lowStock?: string,
  ): Promise<SparePart[]> {
    const isLowStock = lowStock === 'true';
    return this.sparePartsService.findAll(componentType, isLowStock);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику запасных частей' })
  @ApiResponse({ status: 200, description: 'Статистика запасных частей' })
  getStats() {
    return this.sparePartsService.getStats();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Получить запасные части с низким остатком' })
  @ApiResponse({
    status: 200,
    description: 'Запасные части с низким остатком',
    type: [SparePart],
  })
  getLowStock(): Promise<SparePart[]> {
    return this.sparePartsService.getLowStockParts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить запасную часть по ID' })
  @ApiParam({ name: 'id', description: 'UUID запасной части' })
  @ApiResponse({
    status: 200,
    description: 'Данные запасной части',
    type: SparePart,
  })
  @ApiResponse({ status: 404, description: 'Запасная часть не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SparePart> {
    return this.sparePartsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Обновить запасную часть' })
  @ApiParam({ name: 'id', description: 'UUID запасной части' })
  @ApiResponse({
    status: 200,
    description: 'Запасная часть обновлена',
    type: SparePart,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartDto,
  ): Promise<SparePart> {
    return this.sparePartsService.update(id, dto);
  }

  @Post(':id/adjust-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Изменить остаток запасной части' })
  @ApiParam({ name: 'id', description: 'UUID запасной части' })
  @ApiResponse({
    status: 200,
    description: 'Остаток изменен',
    type: SparePart,
  })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ): Promise<SparePart> {
    return this.sparePartsService.adjustStock(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить запасную часть (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID запасной части' })
  @ApiResponse({ status: 204, description: 'Запасная часть удалена' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sparePartsService.remove(id);
  }
}
