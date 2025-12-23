import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientOrder,
  ClientOrderStatus,
  PaymentProvider,
} from '../entities/client-order.entity';
import { ClientPayment, ClientPaymentStatus } from '../entities/client-payment.entity';
import { ClientLoyaltyService } from './client-loyalty.service';

interface InvoiceItem {
  label: string;
  amount: number; // in minimal currency units (tiyin for UZS)
}

interface CreateInvoiceParams {
  title: string;
  description: string;
  payload: string;
  currency: string;
  prices: InvoiceItem[];
  provider_token?: string;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  is_flexible?: boolean;
}

interface TelegramInvoiceResponse {
  ok: boolean;
  result?: string; // Invoice link
  description?: string;
  error_code?: number;
}

/**
 * Telegram Payments Service
 * Handles payment processing via Telegram Payments API
 *
 * Supports multiple payment providers:
 * - Telegram Stars (digital currency)
 * - Payme (Uzbekistan)
 * - Click (Uzbekistan)
 * - etc.
 */
@Injectable()
export class TelegramPaymentsService {
  private readonly logger = new Logger(TelegramPaymentsService.name);
  private readonly botToken: string;
  private readonly providerToken: string | null;
  private readonly apiUrl: string;

  constructor(
    @InjectRepository(ClientOrder)
    private readonly orderRepository: Repository<ClientOrder>,
    @InjectRepository(ClientPayment)
    private readonly paymentRepository: Repository<ClientPayment>,
    private readonly loyaltyService: ClientLoyaltyService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    const providerToken = this.configService.get<string>(
      'TELEGRAM_PAYMENT_PROVIDER_TOKEN',
    );
    this.providerToken = providerToken || null;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured - payments will not work');
    }
    if (!this.providerToken) {
      this.logger.warn(
        'TELEGRAM_PAYMENT_PROVIDER_TOKEN not configured - using Telegram Stars only',
      );
    }
  }

  /**
   * Create Telegram invoice link for an order
   */
  async createInvoiceLink(orderId: string): Promise<string> {
    if (!this.botToken) {
      throw new BadRequestException('Telegram payments not configured');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['machine'],
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== ClientOrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending payment');
    }

    // Build invoice items from order
    const items = order.items || [];
    const prices: InvoiceItem[] = items.map((item) => ({
      label: `${item.product_name} x${item.quantity}`,
      amount: item.price * item.quantity * 100, // Convert to tiyin (1 sum = 100 tiyin)
    }));

    // Add discount if any
    if (order.discount_amount > 0) {
      prices.push({
        label: 'Скидка',
        amount: -Number(order.discount_amount) * 100,
      });
    }

    const machineName = order.machine?.name || 'Автомат';
    const invoiceParams: CreateInvoiceParams = {
      title: `Заказ #${order.id.substring(0, 8)}`,
      description: `Оплата заказа в ${machineName}`,
      payload: JSON.stringify({
        order_id: order.id,
        type: 'vending_order',
      }),
      currency: 'UZS',
      prices,
      provider_token: this.providerToken || undefined,
      need_phone_number: false,
      need_email: false,
    };

    const invoiceLink = await this.callTelegramApi('createInvoiceLink', invoiceParams);

    this.logger.log(`Invoice created for order ${order.id}`);

    return invoiceLink;
  }

  /**
   * Handle successful payment webhook from Telegram
   */
  async handleSuccessfulPayment(
    telegramPaymentChargeId: string,
    providerPaymentChargeId: string,
    orderPayload: string,
    telegramUserId: number,
    totalAmount: number,
    currency: string,
  ): Promise<void> {
    let payload: { order_id: string; type: string };

    try {
      payload = JSON.parse(orderPayload);
    } catch {
      this.logger.error(`Invalid payment payload: ${orderPayload}`);
      throw new BadRequestException('Invalid payment payload');
    }

    if (payload.type !== 'vending_order') {
      this.logger.warn(`Unknown payment type: ${payload.type}`);
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: payload.order_id },
    });

    if (!order) {
      this.logger.error(`Order not found for payment: ${payload.order_id}`);
      throw new BadRequestException('Order not found');
    }

    // Check if already paid
    if (order.status !== ClientOrderStatus.PENDING) {
      this.logger.warn(`Order ${order.id} already processed, status: ${order.status}`);
      return;
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      client_user_id: order.client_user_id,
      provider: PaymentProvider.TELEGRAM,
      provider_tx_id: `${telegramPaymentChargeId}|${providerPaymentChargeId}`,
      amount: totalAmount / 100, // Convert from tiyin to sum
      currency,
      status: ClientPaymentStatus.SUCCESS,
      processed_at: new Date(),
      raw_payload: {
        telegram_payment_charge_id: telegramPaymentChargeId,
        provider_payment_charge_id: providerPaymentChargeId,
        telegram_user_id: telegramUserId,
        order_id: order.id,
      },
    });

    await this.paymentRepository.save(payment);

    // Update order status
    order.status = ClientOrderStatus.PAID;
    order.paid_at = new Date();
    order.provider_tx_id = payment.provider_tx_id;
    await this.orderRepository.save(order);

    // Award loyalty points
    if (order.loyalty_points_earned > 0) {
      await this.loyaltyService.earnPoints(
        order.client_user_id,
        order.loyalty_points_earned,
        order.id,
        `Points earned for order #${order.id.substring(0, 8)}`,
      );
    }

    this.logger.log(`Payment successful for order ${order.id}`);
  }

  /**
   * Handle pre-checkout query from Telegram
   * This is called before the payment is processed
   */
  async handlePreCheckoutQuery(
    preCheckoutQueryId: string,
    orderPayload: string,
  ): Promise<{ ok: boolean; error?: string }> {
    let payload: { order_id: string; type: string };

    try {
      payload = JSON.parse(orderPayload);
    } catch {
      return { ok: false, error: 'Invalid payload' };
    }

    const order = await this.orderRepository.findOne({
      where: { id: payload.order_id },
    });

    if (!order) {
      return { ok: false, error: 'Order not found' };
    }

    if (order.status !== ClientOrderStatus.PENDING) {
      return { ok: false, error: 'Order is no longer available' };
    }

    // Answer pre-checkout query to confirm
    await this.callTelegramApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok: true,
    });

    return { ok: true };
  }

  /**
   * Get order payment status
   */
  async getPaymentStatus(orderId: string): Promise<{
    status: string;
    paid_at?: Date;
    provider_tx_id?: string;
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return {
      status: order.status,
      paid_at: order.paid_at ?? undefined,
      provider_tx_id: order.provider_tx_id ?? undefined,
    };
  }

  /**
   * Call Telegram Bot API
   */
  private async callTelegramApi(
    method: string,
    params: CreateInvoiceParams | Record<string, unknown>,
  ): Promise<string> {
    const response = await fetch(`${this.apiUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as TelegramInvoiceResponse;

    if (!data.ok) {
      this.logger.error(`Telegram API error: ${data.description}`);
      throw new BadRequestException(`Telegram API error: ${data.description}`);
    }

    return data.result!;
  }
}
