/**
 * ШАБЛОН: Controller для модуля
 *
 * Используй этот шаблон для создания новых controllers
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { EntityResponseDto } from './dto/entity-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('entities')
@Controller('entities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * Создание новой сущности
   */
  @Post()
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создать сущность',
    description: 'Создаёт новую сущность с указанными параметрами',
  })
  @ApiResponse({
    status: 201,
    description: 'Сущность успешно создана',
    type: EntityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные входные данные',
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
  })
  async create(
    @Body() createDto: CreateEntityDto,
    @Request() req,
  ): Promise<EntityResponseDto> {
    const entity = await this.entityService.create(createDto, req.user.id);
    return this.toResponseDto(entity);
  }

  /**
   * Получение списка сущностей
   */
  @Get()
  @Roles('admin', 'manager', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Получить список сущностей',
    description: 'Возвращает список сущностей с пагинацией и фильтрами',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Список сущностей',
    type: [EntityResponseDto],
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: EntityResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { data, total } = await this.entityService.findAll(page, limit, {
      status,
      search,
    });

    return {
      data: data.map((e) => this.toResponseDto(e)),
      total,
      page: page || 1,
      limit: limit || 20,
    };
  }

  /**
   * Получение одной сущности
   */
  @Get(':id')
  @Roles('admin', 'manager', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Получить сущность по ID',
    description: 'Возвращает детальную информацию о сущности',
  })
  @ApiResponse({
    status: 200,
    description: 'Сущность найдена',
    type: EntityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Сущность не найдена',
  })
  async findOne(@Param('id') id: string): Promise<EntityResponseDto> {
    const entity = await this.entityService.findOne(id);
    return this.toResponseDto(entity);
  }

  /**
   * Обновление сущности
   */
  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Обновить сущность',
    description: 'Обновляет существующую сущность',
  })
  @ApiResponse({
    status: 200,
    description: 'Сущность обновлена',
    type: EntityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Сущность не найдена',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEntityDto,
    @Request() req,
  ): Promise<EntityResponseDto> {
    const entity = await this.entityService.update(id, updateDto, req.user.id);
    return this.toResponseDto(entity);
  }

  /**
   * Удаление сущности
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить сущность',
    description: 'Удаляет сущность (мягкое удаление)',
  })
  @ApiResponse({
    status: 204,
    description: 'Сущность удалена',
  })
  @ApiResponse({
    status: 404,
    description: 'Сущность не найдена',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.entityService.remove(id);
  }

  // ==================== Private methods ====================

  /**
   * Преобразует Entity в EntityResponseDto
   * Используется для контроля какие поля возвращать клиенту
   */
  private toResponseDto(entity: any): EntityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Не возвращаем чувствительные поля
      // например: password, internalNotes, etc.
    };
  }
}
