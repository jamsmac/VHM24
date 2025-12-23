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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PromoCodesService, PromoCodeStats } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  PromoCodeQueryDto,
} from './dto';
import { PromoCode } from './entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacRolesGuard } from '../auth/guards/rbac-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Promo Codes')
@ApiBearerAuth()
@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RbacRolesGuard)
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({ status: 201, description: 'Promo code created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Promo code already exists' })
  async create(
    @Body() dto: CreatePromoCodeDto,
    @CurrentUser() user: User,
  ): Promise<PromoCode> {
    return this.promoCodesService.create(dto, user.id);
  }

  @Get()
  @Roles('owner', 'admin', 'manager', 'operator')
  @ApiOperation({ summary: 'Get all promo codes with filters' })
  @ApiResponse({ status: 200, description: 'List of promo codes' })
  async findAll(
    @Query() query: PromoCodeQueryDto,
  ): Promise<{ data: PromoCode[]; total: number }> {
    return this.promoCodesService.findAll(query);
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'operator')
  @ApiOperation({ summary: 'Get a promo code by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Promo code details' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCode> {
    return this.promoCodesService.findOne(id);
  }

  @Get(':id/stats')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Get promo code usage statistics' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Promo code statistics' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async getStats(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCodeStats> {
    return this.promoCodesService.getStats(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Update a promo code' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Promo code updated successfully' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<PromoCode> {
    return this.promoCodesService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a promo code' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Promo code activated' })
  @ApiResponse({ status: 400, description: 'Promo code is already active' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCode> {
    return this.promoCodesService.activate(id);
  }

  @Post(':id/pause')
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a promo code' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Promo code paused' })
  @ApiResponse({ status: 400, description: 'Only active promo codes can be paused' })
  async pause(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCode> {
    return this.promoCodesService.pause(id);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a promo code' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Promo code deleted' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.promoCodesService.remove(id);
  }
}
