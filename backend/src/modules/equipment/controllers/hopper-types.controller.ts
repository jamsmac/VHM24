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
import { HopperTypesService } from '../services/hopper-types.service';
import { HopperType } from '../entities/hopper-type.entity';
import { CreateHopperTypeDto, UpdateHopperTypeDto } from '../dto/hopper-type.dto';

@ApiTags('Equipment - Hopper Types')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment/hopper-types')
export class HopperTypesController {
  constructor(private readonly hopperTypesService: HopperTypesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Создать новый тип бункера',
    description: 'Создаёт новый тип ингредиента для бункеров (REQ-ASSET-BH-01)',
  })
  @ApiResponse({
    status: 201,
    description: 'Тип бункера создан',
    type: HopperType,
  })
  @ApiResponse({
    status: 400,
    description: 'Тип с таким code уже существует',
  })
  create(@Body() dto: CreateHopperTypeDto): Promise<HopperType> {
    return this.hopperTypesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить все типы бункеров',
    description:
      'Возвращает список всех типов ингредиентов с опциональной фильтрацией по категории',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category (dairy, tea, coffee, chocolate, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список типов бункеров',
    type: [HopperType],
  })
  findAll(@Query('category') category?: string): Promise<HopperType[]> {
    return this.hopperTypesService.findAll(category);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Получить список категорий',
    description: 'Возвращает уникальный список всех категорий типов бункеров',
  })
  @ApiResponse({
    status: 200,
    description: 'Список категорий',
    type: [String],
  })
  getCategories(): Promise<string[]> {
    return this.hopperTypesService.getCategories();
  }

  @Get('by-code/:code')
  @ApiOperation({
    summary: 'Получить тип бункера по коду',
    description: 'Возвращает тип бункера по уникальному коду',
  })
  @ApiParam({ name: 'code', description: 'Код типа бункера (milk_powder, sugar, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Тип бункера',
    type: HopperType,
  })
  @ApiResponse({ status: 404, description: 'Тип не найден' })
  findByCode(@Param('code') code: string): Promise<HopperType> {
    return this.hopperTypesService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить тип бункера по ID',
  })
  @ApiParam({ name: 'id', description: 'UUID типа бункера' })
  @ApiResponse({
    status: 200,
    description: 'Тип бункера',
    type: HopperType,
  })
  @ApiResponse({ status: 404, description: 'Тип не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<HopperType> {
    return this.hopperTypesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Обновить тип бункера',
    description: 'Обновляет данные типа бункера (code изменить нельзя)',
  })
  @ApiParam({ name: 'id', description: 'UUID типа бункера' })
  @ApiResponse({
    status: 200,
    description: 'Тип бункера обновлён',
    type: HopperType,
  })
  @ApiResponse({ status: 404, description: 'Тип не найден' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHopperTypeDto,
  ): Promise<HopperType> {
    return this.hopperTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить тип бункера (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'UUID типа бункера' })
  @ApiResponse({ status: 204, description: 'Тип удалён' })
  @ApiResponse({ status: 404, description: 'Тип не найден' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.hopperTypesService.remove(id);
  }
}
