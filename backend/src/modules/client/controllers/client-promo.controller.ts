import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientAuthGuard } from '../guards/client-auth.guard';
import { PromoCodesService } from '../../promo-codes/promo-codes.service';
import {
  ValidatePromoCodeDto,
  ValidatePromoCodeResponseDto,
} from '../../promo-codes/dto/validate-promo-code.dto';
import { ClientUser } from '../entities/client-user.entity';
import { CurrentClientUser } from './client-orders.controller';

@ApiTags('Client Promo Codes')
@Controller('client/promo-codes')
@UseGuards(ClientAuthGuard)
@ApiBearerAuth()
export class ClientPromoController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a promo code' })
  @ApiResponse({
    status: 200,
    description: 'Promo code validation result',
    type: ValidatePromoCodeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validatePromoCode(
    @CurrentClientUser() user: ClientUser,
    @Body() dto: ValidatePromoCodeDto,
  ): Promise<ValidatePromoCodeResponseDto> {
    return this.promoCodesService.validate(dto, user.id);
  }
}
