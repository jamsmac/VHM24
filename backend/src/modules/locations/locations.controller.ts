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
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location, LocationStatus } from './entities/location.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('Locations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Создать новую локацию' })
  @ApiResponse({
    status: 201,
    description: 'Локация успешно создана',
    type: Location,
  })
  @ApiResponse({
    status: 409,
    description: 'Локация с таким названием уже существует в городе',
  })
  create(@Body() createLocationDto: CreateLocationDto): Promise<Location> {
    return this.locationsService.create(createLocationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех локаций' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: LocationStatus,
    description: 'Фильтр по статусу',
  })
  @ApiResponse({
    status: 200,
    description: 'Список локаций',
    type: [Location],
  })
  findAll(@Query('status') status?: LocationStatus): Promise<Location[]> {
    return this.locationsService.findAll(status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику по локациям' })
  @ApiResponse({
    status: 200,
    description: 'Статистика локаций',
  })
  getStats() {
    return this.locationsService.getStats();
  }

  @Get('map')
  @ApiOperation({ summary: 'Получить данные для карты локаций' })
  @ApiResponse({
    status: 200,
    description: 'Локации с координатами и статистикой аппаратов',
  })
  getMapData() {
    return this.locationsService.getMapData();
  }

  @Get('by-city/:city')
  @ApiOperation({ summary: 'Получить локации по городу' })
  @ApiParam({ name: 'city', description: 'Название города' })
  @ApiResponse({
    status: 200,
    description: 'Список локаций в городе',
    type: [Location],
  })
  findByCity(@Param('city') city: string): Promise<Location[]> {
    return this.locationsService.findByCity(city);
  }

  @Get('by-type/:type_code')
  @ApiOperation({ summary: 'Получить локации по типу' })
  @ApiParam({ name: 'type_code', description: 'Код типа локации' })
  @ApiResponse({
    status: 200,
    description: 'Список локаций по типу',
    type: [Location],
  })
  findByType(@Param('type_code') type_code: string): Promise<Location[]> {
    return this.locationsService.findByType(type_code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить локацию по ID' })
  @ApiParam({ name: 'id', description: 'UUID локации' })
  @ApiResponse({
    status: 200,
    description: 'Данные локации',
    type: Location,
  })
  @ApiResponse({ status: 404, description: 'Локация не найдена' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Location> {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить локацию' })
  @ApiParam({ name: 'id', description: 'UUID локации' })
  @ApiResponse({
    status: 200,
    description: 'Локация успешно обновлена',
    type: Location,
  })
  @ApiResponse({ status: 404, description: 'Локация не найдена' })
  @ApiResponse({
    status: 409,
    description: 'Локация с таким названием уже существует',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить локацию (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID локации' })
  @ApiResponse({ status: 204, description: 'Локация успешно удалена' })
  @ApiResponse({ status: 404, description: 'Локация не найдена' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.locationsService.remove(id);
  }
}
