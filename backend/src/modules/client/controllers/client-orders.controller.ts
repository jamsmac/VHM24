import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientAuthGuard } from '../guards/client-auth.guard';
import { ClientOrdersService } from '../services/client-orders.service';
import { TelegramPaymentsService } from '../services/telegram-payments.service';
import {
  CreateClientOrderDto,
  ClientOrderQueryDto,
  ClientOrderResponseDto,
} from '../dto/client-order.dto';
import { ClientUser } from '../entities/client-user.entity';

/**
 * Decorator to get current client user from request
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentClientUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.clientUser;
  },
);

@ApiTags('Client Orders')
@Controller('client/orders')
@UseGuards(ClientAuthGuard)
@ApiBearerAuth()
export class ClientOrdersController {
  constructor(
    private readonly ordersService: ClientOrdersService,
    private readonly paymentsService: TelegramPaymentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Machine or product not found' })
  async createOrder(
    @CurrentClientUser() user: ClientUser,
    @Body() dto: CreateClientOrderDto,
  ): Promise<ClientOrderResponseDto> {
    return this.ordersService.createOrder(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get client orders with pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrders(
    @CurrentClientUser() user: ClientUser,
    @Query() query: ClientOrderQueryDto,
  ): Promise<{ data: ClientOrderResponseDto[]; total: number }> {
    return this.ordersService.getOrders(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @CurrentClientUser() user: ClientUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientOrderResponseDto> {
    return this.ordersService.getOrder(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @CurrentClientUser() user: ClientUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientOrderResponseDto> {
    return this.ordersService.cancelOrder(user, id);
  }

  @Post(':id/invoice')
  @ApiOperation({ summary: 'Create Telegram invoice link for order payment' })
  @ApiResponse({ status: 201, description: 'Invoice link created successfully' })
  @ApiResponse({ status: 400, description: 'Order not eligible for payment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createInvoice(
    @CurrentClientUser() user: ClientUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ invoice_link: string }> {
    // Verify order belongs to user
    await this.ordersService.getOrder(user, id);
    const invoiceLink = await this.paymentsService.createInvoiceLink(id);
    return { invoice_link: invoiceLink };
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Get payment status for an order' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getPaymentStatus(
    @CurrentClientUser() user: ClientUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ status: string; paid_at?: Date; payment_id?: string }> {
    // Verify order belongs to user
    await this.ordersService.getOrder(user, id);
    return this.paymentsService.getPaymentStatus(id);
  }
}
