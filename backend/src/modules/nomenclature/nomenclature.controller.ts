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
import { NomenclatureService } from './nomenclature.service';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';
import { Nomenclature } from './entities/nomenclature.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Nomenclature')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nomenclature')
export class NomenclatureController {
  constructor(private readonly nomenclatureService: NomenclatureService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать позицию номенклатуры' })
  @ApiResponse({
    status: 201,
    description: 'Номенклатура успешно создана',
    type: Nomenclature,
  })
  @ApiResponse({
    status: 409,
    description: 'Номенклатура с таким SKU уже существует',
  })
  create(@Body() createNomenclatureDto: CreateNomenclatureDto): Promise<Nomenclature> {
    return this.nomenclatureService.create(createNomenclatureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список номенклатуры' })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Фильтр по категории',
  })
  @ApiQuery({
    name: 'isIngredient',
    required: false,
    type: Boolean,
    description: 'Только ингредиенты или товары',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Только активные',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по названию, SKU, тегам',
  })
  @ApiResponse({
    status: 200,
    description: 'Список номенклатуры',
    type: [Nomenclature],
  })
  findAll(
    @Query('category') category?: string,
    @Query('isIngredient') isIngredient?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<Nomenclature[]> {
    return this.nomenclatureService.findAll(
      category,
      isIngredient === 'true' ? true : isIngredient === 'false' ? false : undefined,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по номенклатуре' })
  @ApiResponse({
    status: 200,
    description: 'Статистика номенклатуры',
  })
  getStats() {
    return this.nomenclatureService.getStats();
  }

  @Get('products')
  @ApiOperation({ summary: 'Получить только товары (не ингредиенты)' })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Фильтр по категории',
  })
  @ApiResponse({
    status: 200,
    description: 'Список товаров',
    type: [Nomenclature],
  })
  findProducts(@Query('category') category?: string): Promise<Nomenclature[]> {
    return this.nomenclatureService.findProducts(category);
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'Получить только ингредиенты' })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Фильтр по категории',
  })
  @ApiResponse({
    status: 200,
    description: 'Список ингредиентов',
    type: [Nomenclature],
  })
  findIngredients(@Query('category') category?: string): Promise<Nomenclature[]> {
    return this.nomenclatureService.findIngredients(category);
  }

  @Get('by-sku/:sku')
  @ApiOperation({ summary: 'Получить номенклатуру по SKU' })
  @ApiParam({ name: 'sku', description: 'SKU номенклатуры' })
  @ApiResponse({
    status: 200,
    description: 'Данные номенклатуры',
    type: Nomenclature,
  })
  @ApiResponse({ status: 404, description: 'Номенклатура не найдена' })
  findBySKU(@Param('sku') sku: string): Promise<Nomenclature> {
    return this.nomenclatureService.findBySKU(sku);
  }

  @Get('by-barcode/:barcode')
  @ApiOperation({ summary: 'Получить номенклатуру по штрих-коду' })
  @ApiParam({ name: 'barcode', description: 'Штрих-код' })
  @ApiResponse({
    status: 200,
    description: 'Данные номенклатуры',
    type: Nomenclature,
  })
  @ApiResponse({ status: 404, description: 'Номенклатура не найдена' })
  findByBarcode(@Param('barcode') barcode: string): Promise<Nomenclature | null> {
    return this.nomenclatureService.findByBarcode(barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить номенклатуру по ID' })
  @ApiParam({ name: 'id', description: 'UUID номенклатуры' })
  @ApiResponse({
    status: 200,
    description: 'Данные номенклатуры',
    type: Nomenclature,
  })
  @ApiResponse({ status: 404, description: 'Номенклатура не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Nomenclature> {
    return this.nomenclatureService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить номенклатуру' })
  @ApiParam({ name: 'id', description: 'UUID номенклатуры' })
  @ApiResponse({
    status: 200,
    description: 'Номенклатура успешно обновлена',
    type: Nomenclature,
  })
  @ApiResponse({ status: 404, description: 'Номенклатура не найдена' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNomenclatureDto: UpdateNomenclatureDto,
  ): Promise<Nomenclature> {
    return this.nomenclatureService.update(id, updateNomenclatureDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить номенклатуру (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID номенклатуры' })
  @ApiResponse({ status: 204, description: 'Номенклатура успешно удалена' })
  @ApiResponse({ status: 404, description: 'Номенклатура не найдена' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.nomenclatureService.remove(id);
  }
}
