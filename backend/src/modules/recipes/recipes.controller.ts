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
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { Recipe } from './entities/recipe.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Recipes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать рецепт' })
  @ApiResponse({
    status: 201,
    description: 'Рецепт успешно создан',
    type: Recipe,
  })
  @ApiResponse({
    status: 409,
    description: 'Рецепт для этого продукта и типа уже существует',
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные (нет ингредиентов или ингредиент не является ингредиентом)',
  })
  create(@Body() createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    return this.recipesService.create(createRecipeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список рецептов' })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Фильтр по продукту',
  })
  @ApiQuery({
    name: 'typeCode',
    required: false,
    type: String,
    description: 'Фильтр по типу рецепта',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Только активные',
  })
  @ApiResponse({
    status: 200,
    description: 'Список рецептов',
    type: [Recipe],
  })
  findAll(
    @Query('productId') productId?: string,
    @Query('typeCode') typeCode?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Recipe[]> {
    return this.recipesService.findAll(
      productId,
      typeCode,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по рецептам' })
  @ApiResponse({
    status: 200,
    description: 'Статистика рецептов',
  })
  getStats() {
    return this.recipesService.getStats();
  }

  @Get('by-product/:productId')
  @ApiOperation({ summary: 'Получить рецепты по продукту' })
  @ApiParam({ name: 'productId', description: 'UUID продукта' })
  @ApiResponse({
    status: 200,
    description: 'Список рецептов для продукта',
    type: [Recipe],
  })
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string): Promise<Recipe[]> {
    return this.recipesService.findByProduct(productId);
  }

  @Get('by-product/:productId/primary')
  @ApiOperation({ summary: 'Получить основной (primary) рецепт для продукта' })
  @ApiParam({ name: 'productId', description: 'UUID продукта' })
  @ApiResponse({
    status: 200,
    description: 'Основной рецепт',
    type: Recipe,
  })
  @ApiResponse({ status: 404, description: 'Основной рецепт не найден' })
  findPrimaryRecipe(@Param('productId', ParseUUIDPipe) productId: string): Promise<Recipe | null> {
    return this.recipesService.findPrimaryRecipe(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить рецепт по ID' })
  @ApiParam({ name: 'id', description: 'UUID рецепта' })
  @ApiResponse({
    status: 200,
    description: 'Данные рецепта',
    type: Recipe,
  })
  @ApiResponse({ status: 404, description: 'Рецепт не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Recipe> {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить рецепт' })
  @ApiParam({ name: 'id', description: 'UUID рецепта' })
  @ApiResponse({
    status: 200,
    description: 'Рецепт успешно обновлен',
    type: Recipe,
  })
  @ApiResponse({ status: 404, description: 'Рецепт не найден' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ): Promise<Recipe> {
    return this.recipesService.update(id, updateRecipeDto);
  }

  @Post(':id/recalculate-cost')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Пересчитать себестоимость рецепта' })
  @ApiParam({ name: 'id', description: 'UUID рецепта' })
  @ApiResponse({
    status: 200,
    description: 'Себестоимость пересчитана',
  })
  @ApiResponse({ status: 404, description: 'Рецепт не найден' })
  async recalculateCost(@Param('id', ParseUUIDPipe) id: string): Promise<{ total_cost: number }> {
    const cost = await this.recipesService.recalculateCost(id);
    return { total_cost: cost };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить рецепт (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID рецепта' })
  @ApiResponse({ status: 204, description: 'Рецепт успешно удален' })
  @ApiResponse({ status: 404, description: 'Рецепт не найден' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.recipesService.remove(id);
  }
}
