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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UpdateMaterialDto } from './dto';
import { MaterialCategory } from './entities/material.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('materials')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать материал' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все материалы' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'category', required: false, enum: MaterialCategory })
  @ApiQuery({ name: 'supplier_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('is_active') is_active?: string,
    @Query('category') category?: MaterialCategory,
    @Query('supplier_id') supplier_id?: string,
    @Query('search') search?: string,
  ) {
    return this.materialsService.findAll({
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      category,
      supplier_id,
      search,
    });
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Получить материалы по категориям (для каталога)' })
  findGrouped() {
    return this.materialsService.findGroupedByCategory();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить материал по ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить материал' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Деактивировать материал' })
  @ApiParam({ name: 'id', type: String })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Удалить материал' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.remove(id);
  }
}
