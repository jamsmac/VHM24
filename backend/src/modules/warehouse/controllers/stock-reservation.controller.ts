import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StockReservationService } from '../services/stock-reservation.service';
import { CreateReservationDto, FulfillReservationDto } from '../dto/create-reservation.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('stock-reservations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-reservations')
export class StockReservationController {
  constructor(private readonly reservationService: StockReservationService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async createReservation(@Body() dto: CreateReservationDto) {
    return this.reservationService.createReservation(dto);
  }

  @Put(':id/fulfill')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async fulfillReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FulfillReservationDto,
  ) {
    return this.reservationService.fulfillReservation(id, dto.quantity_fulfilled);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async cancelReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.cancelReservation(id);
  }

  @Get('active/:warehouseId')
  async getActiveReservations(@Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.reservationService.getActiveReservations(warehouseId);
  }

  @Post('expire-old')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async expireOldReservations() {
    const count = await this.reservationService.expireOldReservations();
    return { expired_count: count };
  }
}
