import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientPublicService } from '../services/client-public.service';
import {
  PublicLocationsQueryDto,
  PublicLocationResponseDto,
  PublicMenuQueryDto,
  MenuItemResponseDto,
  QrResolveDto,
  QrResolveResponseDto,
  CooperationRequestDto,
} from '../dto/client-public.dto';

/**
 * Public API controller for client-facing endpoints.
 * No authentication required.
 */
@ApiTags('Client Public')
@Controller('client/public')
export class ClientPublicController {
  constructor(private readonly clientPublicService: ClientPublicService) {}

  @Get('locations')
  @ApiOperation({ summary: 'Get public locations list' })
  @ApiResponse({ status: 200, description: 'List of public locations' })
  async getLocations(@Query() query: PublicLocationsQueryDto): Promise<{
    data: PublicLocationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.clientPublicService.getPublicLocations(query);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get list of cities with vending machines' })
  @ApiResponse({ status: 200, description: 'List of city names' })
  async getCities(): Promise<string[]> {
    return this.clientPublicService.getCities();
  }

  @Get('menu')
  @ApiOperation({ summary: 'Get machine menu (available products)' })
  @ApiResponse({ status: 200, description: 'List of available products' })
  async getMenu(@Query() query: PublicMenuQueryDto): Promise<MenuItemResponseDto[]> {
    return this.clientPublicService.getMachineMenu(query);
  }

  @Post('qr/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve QR code to machine info' })
  @ApiResponse({ status: 200, description: 'Machine info for QR code' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async resolveQrCode(@Body() dto: QrResolveDto): Promise<QrResolveResponseDto> {
    return this.clientPublicService.resolveQrCode(dto);
  }

  @Post('cooperation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit cooperation request' })
  @ApiResponse({ status: 200, description: 'Request submitted successfully' })
  async submitCooperationRequest(
    @Body() dto: CooperationRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    // TODO: Implement cooperation request handling (email/notification)
    // For now, just log and return success
    // eslint-disable-next-line no-console
    console.log('Cooperation request received:', dto);

    return {
      success: true,
      message: 'Спасибо за ваш интерес! Мы свяжемся с вами в ближайшее время.',
    };
  }
}
