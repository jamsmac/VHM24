import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientLoyaltyService } from '../services/client-loyalty.service';
import { ClientLoyaltyLedger } from '../entities/client-loyalty-ledger.entity';
import {
  ClientAuthGuard,
  CurrentClientUser,
  ClientUserPayload,
} from '../guards/client-auth.guard';

/**
 * Client loyalty points controller.
 */
@ApiTags('Client Loyalty')
@Controller('client/loyalty')
@UseGuards(ClientAuthGuard)
@ApiBearerAuth()
export class ClientLoyaltyController {
  constructor(private readonly clientLoyaltyService: ClientLoyaltyService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get loyalty points balance' })
  @ApiResponse({ status: 200, description: 'Loyalty balance info' })
  async getBalance(
    @CurrentClientUser() user: ClientUserPayload,
  ): Promise<{
    points_balance: number;
    lifetime_points: number;
    points_value_uzs: number;
  }> {
    return this.clientLoyaltyService.getBalance(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get loyalty points transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getHistory(
    @CurrentClientUser() user: ClientUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    data: ClientLoyaltyLedger[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.clientLoyaltyService.getHistory(user.id, {
      page: page || 1,
      limit: limit || 20,
    });
  }
}
