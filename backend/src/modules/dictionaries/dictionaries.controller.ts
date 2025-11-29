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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DictionaryCacheService } from './services/dictionary-cache.service';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Dictionaries')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dictionaries')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DictionariesController {
  constructor(private readonly dictionaryCacheService: DictionaryCacheService) {}

  // ==================== DICTIONARIES ====================

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать новый справочник' })
  @ApiResponse({
    status: 201,
    description: 'Справочник успешно создан',
    type: Dictionary,
  })
  @ApiResponse({ status: 409, description: 'Справочник с таким кодом уже существует' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  createDictionary(@Body() createDictionaryDto: CreateDictionaryDto): Promise<Dictionary> {
    return this.dictionaryCacheService.createDictionary(createDictionaryDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить список всех справочников' })
  @ApiQuery({
    name: 'includeItems',
    required: false,
    type: Boolean,
    description: 'Включить элементы справочников',
  })
  @ApiResponse({
    status: 200,
    description: 'Список справочников',
    type: [Dictionary],
  })
  findAllDictionaries(@Query('includeItems') includeItems?: string): Promise<Dictionary[]> {
    return this.dictionaryCacheService.findAllDictionaries(includeItems === 'true');
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить справочник по ID' })
  @ApiParam({ name: 'id', description: 'UUID справочника' })
  @ApiQuery({
    name: 'includeItems',
    required: false,
    type: Boolean,
    description: 'Включить элементы справочника',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные справочника',
    type: Dictionary,
  })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  findOneDictionary(
    @Param('id') id: string,
    @Query('includeItems') includeItems?: string,
  ): Promise<Dictionary> {
    return this.dictionaryCacheService.findOneDictionary(id, includeItems !== 'false');
  }

  @Get('by-code/:code')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить справочник по коду' })
  @ApiParam({ name: 'code', description: 'Код справочника', example: 'machine_types' })
  @ApiQuery({
    name: 'includeItems',
    required: false,
    type: Boolean,
    description: 'Включить элементы справочника',
  })
  @ApiResponse({
    status: 200,
    description: 'Данные справочника',
    type: Dictionary,
  })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  findByCode(
    @Param('code') code: string,
    @Query('includeItems') includeItems?: string,
  ): Promise<Dictionary> {
    return this.dictionaryCacheService.findByCode(code, includeItems !== 'false');
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить справочник' })
  @ApiParam({ name: 'id', description: 'UUID справочника' })
  @ApiResponse({
    status: 200,
    description: 'Справочник успешно обновлен',
    type: Dictionary,
  })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  @ApiResponse({ status: 400, description: 'Невозможно изменить системный справочник' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  updateDictionary(
    @Param('id') id: string,
    @Body() updateDictionaryDto: UpdateDictionaryDto,
  ): Promise<Dictionary> {
    return this.dictionaryCacheService.updateDictionary(id, updateDictionaryDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить справочник' })
  @ApiParam({ name: 'id', description: 'UUID справочника' })
  @ApiResponse({ status: 204, description: 'Справочник успешно удален' })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  @ApiResponse({ status: 400, description: 'Невозможно удалить системный справочник' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  removeDictionary(@Param('id') id: string): Promise<void> {
    return this.dictionaryCacheService.removeDictionary(id);
  }

  // ==================== DICTIONARY ITEMS ====================

  @Post(':dictionaryId/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать элемент справочника' })
  @ApiParam({ name: 'dictionaryId', description: 'UUID справочника' })
  @ApiResponse({
    status: 201,
    description: 'Элемент успешно создан',
    type: DictionaryItem,
  })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  @ApiResponse({ status: 409, description: 'Элемент с таким кодом уже существует' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  createDictionaryItem(
    @Param('dictionaryId') dictionaryId: string,
    @Body() createDictionaryItemDto: CreateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    return this.dictionaryCacheService.createDictionaryItem(dictionaryId, createDictionaryItemDto);
  }

  @Get(':dictionaryId/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить все элементы справочника' })
  @ApiParam({ name: 'dictionaryId', description: 'UUID справочника' })
  @ApiResponse({
    status: 200,
    description: 'Список элементов справочника',
    type: [DictionaryItem],
  })
  @ApiResponse({ status: 404, description: 'Справочник не найден' })
  findAllDictionaryItems(@Param('dictionaryId') dictionaryId: string): Promise<DictionaryItem[]> {
    return this.dictionaryCacheService.findAllDictionaryItems(dictionaryId);
  }

  @Get('items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить элемент справочника по ID' })
  @ApiParam({ name: 'id', description: 'UUID элемента справочника' })
  @ApiResponse({
    status: 200,
    description: 'Данные элемента справочника',
    type: DictionaryItem,
  })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  findOneDictionaryItem(@Param('id') id: string): Promise<DictionaryItem> {
    return this.dictionaryCacheService.findOneDictionaryItem(id);
  }

  @Patch('items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить элемент справочника' })
  @ApiParam({ name: 'id', description: 'UUID элемента справочника' })
  @ApiResponse({
    status: 200,
    description: 'Элемент успешно обновлен',
    type: DictionaryItem,
  })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  updateDictionaryItem(
    @Param('id') id: string,
    @Body() updateDictionaryItemDto: UpdateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    return this.dictionaryCacheService.updateDictionaryItem(id, updateDictionaryItemDto);
  }

  @Delete('items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить элемент справочника' })
  @ApiParam({ name: 'id', description: 'UUID элемента справочника' })
  @ApiResponse({ status: 204, description: 'Элемент успешно удален' })
  @ApiResponse({ status: 404, description: 'Элемент не найден' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  removeDictionaryItem(@Param('id') id: string): Promise<void> {
    return this.dictionaryCacheService.removeDictionaryItem(id);
  }
}
