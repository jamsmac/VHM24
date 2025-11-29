import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Files')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Загрузить файл' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'entity_type', 'entity_id', 'category_code'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entity_type: {
          type: 'string',
          example: 'task',
        },
        entity_id: {
          type: 'string',
          example: 'uuid',
        },
        category_code: {
          type: 'string',
          example: 'task_photo_before',
        },
        uploaded_by_user_id: {
          type: 'string',
          example: 'uuid',
        },
        description: {
          type: 'string',
          example: 'Фото аппарата перед пополнением',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Файл успешно загружен',
    type: File,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или файл слишком большой',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('entity_type') entityType: string,
    @Body('entity_id') entityId: string,
    @Body('category_code') categoryCode: string,
    @Body('uploaded_by_user_id') uploadedByUserId: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string | string[],
  ): Promise<File> {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    // Parse tags if string
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

    return this.filesService.uploadFile(
      file,
      entityType,
      entityId,
      categoryCode,
      uploadedByUserId,
      description,
      parsedTags,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить список файлов' })
  @ApiQuery({
    name: 'entity_type',
    required: false,
    type: String,
    description: 'Фильтр по типу сущности',
  })
  @ApiQuery({
    name: 'entity_id',
    required: false,
    type: String,
    description: 'Фильтр по ID сущности',
  })
  @ApiQuery({
    name: 'category_code',
    required: false,
    type: String,
    description: 'Фильтр по категории',
  })
  @ApiResponse({
    status: 200,
    description: 'Список файлов',
    type: [File],
  })
  findAll(
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('category_code') categoryCode?: string,
  ): Promise<File[]> {
    return this.filesService.findAll(entityType, entityId, categoryCode);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по файлам' })
  @ApiResponse({
    status: 200,
    description: 'Статистика файлов',
  })
  getStats() {
    return this.filesService.getStats();
  }

  @Get('by-entity/:entity_type/:entity_id')
  @ApiOperation({ summary: 'Получить файлы по сущности' })
  @ApiParam({ name: 'entity_type', description: 'Тип сущности', example: 'task' })
  @ApiParam({ name: 'entity_id', description: 'ID сущности' })
  @ApiResponse({
    status: 200,
    description: 'Список файлов сущности',
    type: [File],
  })
  findByEntity(
    @Param('entity_type') entityType: string,
    @Param('entity_id', ParseUUIDPipe) entityId: string,
  ): Promise<File[]> {
    return this.filesService.findByEntity(entityType, entityId);
  }

  @Get('validate-task-photos/:task_id')
  @ApiOperation({ summary: 'Проверить наличие обязательных фото для задачи' })
  @ApiParam({ name: 'task_id', description: 'UUID задачи' })
  @ApiResponse({
    status: 200,
    description: 'Результат валидации фото',
  })
  validateTaskPhotos(@Param('task_id', ParseUUIDPipe) taskId: string) {
    return this.filesService.validateTaskPhotos(taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить файл по ID' })
  @ApiParam({ name: 'id', description: 'UUID файла' })
  @ApiResponse({
    status: 200,
    description: 'Данные файла',
    type: File,
  })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<File> {
    return this.filesService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiParam({ name: 'id', description: 'UUID файла' })
  @ApiResponse({ status: 204, description: 'Файл успешно удален' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.filesService.remove(id);
  }
}
