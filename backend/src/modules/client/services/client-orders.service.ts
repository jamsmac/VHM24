import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientOrder,
  ClientOrderStatus,
} from '../entities/client-order.entity';
import { ClientUser } from '../entities/client-user.entity';
import { ClientPayment } from '../entities/client-payment.entity';
import { ClientLoyaltyService } from './client-loyalty.service';
import { PromoCodesService } from '@/modules/promo-codes/promo-codes.service';
import {
  CreateClientOrderDto,
  ClientOrderQueryDto,
  ClientOrderResponseDto,
} from '../dto/client-order.dto';
import { Machine } from '@/modules/machines/entities/machine.entity';
import { Nomenclature } from '@/modules/nomenclature/entities/nomenclature.entity';

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Injectable()
export class ClientOrdersService {
  constructor(
    @InjectRepository(ClientOrder)
    private readonly orderRepository: Repository<ClientOrder>,
    @InjectRepository(ClientPayment)
    private readonly paymentRepository: Repository<ClientPayment>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
    private readonly loyaltyService: ClientLoyaltyService,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  /**
   * Create a new order
   */
  async createOrder(
    clientUser: ClientUser,
    dto: CreateClientOrderDto,
  ): Promise<ClientOrderResponseDto> {
    // Validate machine
    const machine = await this.machineRepository.findOne({
      where: { id: dto.machine_id },
    });

    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    if (machine.status !== 'active') {
      throw new BadRequestException('Machine is not available');
    }

    // Build order items and calculate totals
    let baseAmount = 0;
    const orderItems: OrderItem[] = [];
    const productIds: string[] = [];

    for (const item of dto.items) {
      const product = await this.nomenclatureRepository.findOne({
        where: { id: item.product_id },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const unitPrice = item.unit_price ?? 0;
      const itemTotal = unitPrice * item.quantity;
      baseAmount += itemTotal;

      orderItems.push({
        product_id: product.id,
        name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
      });

      productIds.push(product.id);
    }

    // Apply promo code if provided
    let promoCodeId: string | null = null;
    let promoDiscount = 0;
    let promoLoyaltyBonus = 0;

    if (dto.promo_code) {
      const validation = await this.promoCodesService.validate(
        {
          code: dto.promo_code,
          order_amount: baseAmount,
          machine_id: dto.machine_id,
          location_id: machine.location_id ?? undefined,
          product_ids: productIds,
        },
        clientUser.id,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.error || 'Invalid promo code');
      }

      promoCodeId = validation.promo_code_id!;
      promoDiscount = validation.discount_amount || 0;
      promoLoyaltyBonus = validation.bonus_points || 0;
    }

    // Calculate points redemption
    let pointsRedeemed = 0;
    let discountFromPoints = 0;

    // Calculate amount after promo discount for points redemption limit
    const amountAfterPromo = baseAmount - promoDiscount;

    if (dto.redeem_points && dto.redeem_points > 0) {
      const balance = await this.loyaltyService.getBalance(clientUser.id);
      const maxRedeemable = Math.min(dto.redeem_points, balance.points_balance);
      // Limit points to 50% of remaining amount
      const maxPointsDiscount = amountAfterPromo * 0.5;
      const actualPointsValue = Math.min(maxRedeemable * 100, maxPointsDiscount);
      pointsRedeemed = Math.floor(actualPointsValue / 100);
      discountFromPoints = pointsRedeemed * 100;
    }

    // Calculate total discount and final amount
    const totalDiscount = promoDiscount + discountFromPoints;
    const finalAmount = Math.max(0, baseAmount - totalDiscount);

    // Calculate points to earn (1% of final amount) + promo bonus
    const basePointsEarned = Math.floor(finalAmount / 1000);
    const totalPointsEarned = basePointsEarned + promoLoyaltyBonus;

    // Create order
    const order = this.orderRepository.create({
      client_user_id: clientUser.id,
      machine_id: dto.machine_id,
      location_id: machine.location_id,
      status: ClientOrderStatus.PENDING,
      items: orderItems,
      currency: 'UZS',
      total_amount: finalAmount,
      discount_amount: totalDiscount,
      promo_code_id: promoCodeId,
      loyalty_points_earned: totalPointsEarned,
      loyalty_points_used: pointsRedeemed,
      payment_provider: dto.payment_provider,
    });

    await this.orderRepository.save(order);

    // Apply promo code redemption (increments usage counter)
    if (promoCodeId) {
      await this.promoCodesService.applyToOrder(
        promoCodeId,
        clientUser.id,
        order.id,
        promoDiscount,
        promoLoyaltyBonus,
      );
    }

    // Redeem loyalty points if any
    if (pointsRedeemed > 0) {
      await this.loyaltyService.redeemPoints(
        clientUser.id,
        pointsRedeemed,
        order.id,
        `Points redeemed for order #${order.id.substring(0, 8)}`,
      );
    }

    return this.mapToResponseDto(order, machine, baseAmount);
  }

  /**
   * Get client's orders with pagination
   */
  async getOrders(
    clientUser: ClientUser,
    query: ClientOrderQueryDto,
  ): Promise<{ data: ClientOrderResponseDto[]; total: number }> {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.machine', 'machine')
      .where('order.client_user_id = :clientUserId', { clientUserId: clientUser.id })
      .orderBy('order.created_at', 'DESC');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    const [orders, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders.map((order) => this.mapToResponseDto(order, order.machine)),
      total,
    };
  }

  /**
   * Get a single order by ID
   */
  async getOrder(clientUser: ClientUser, orderId: string): Promise<ClientOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, client_user_id: clientUser.id },
      relations: ['machine'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToResponseDto(order, order.machine);
  }

  /**
   * Cancel an order (only if pending)
   */
  async cancelOrder(clientUser: ClientUser, orderId: string): Promise<ClientOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, client_user_id: clientUser.id },
      relations: ['machine'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (![ClientOrderStatus.PENDING].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    // Refund loyalty points if any were used for this order
    if (order.loyalty_points_used > 0) {
      await this.loyaltyService.refundPoints(
        clientUser.id,
        order.loyalty_points_used,
        order.id,
        `Points refunded for cancelled order #${order.id.substring(0, 8)}`,
      );
    }

    order.status = ClientOrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return this.mapToResponseDto(order, order.machine);
  }

  /**
   * Map order entity to response DTO
   */
  private mapToResponseDto(
    order: ClientOrder,
    machine?: Machine,
    baseAmount?: number,
  ): ClientOrderResponseDto {
    const totalAmount = Number(order.total_amount);
    const discountAmount = Number(order.discount_amount || 0);
    // Base amount is totalAmount + discount if not provided
    const originalAmount = baseAmount ?? totalAmount + discountAmount;

    return {
      id: order.id,
      status: order.status,
      total_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: totalAmount,
      points_earned: order.loyalty_points_earned,
      points_redeemed: order.loyalty_points_used,
      payment_provider: order.payment_provider,
      machine: machine
        ? {
            id: machine.id,
            name: machine.name,
            machine_number: machine.machine_number,
          }
        : undefined,
      created_at: order.created_at,
      paid_at: order.paid_at ?? undefined,
    };
  }
}
