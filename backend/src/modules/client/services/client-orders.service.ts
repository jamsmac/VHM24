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
  PaymentProvider,
} from '../entities/client-order.entity';
import { ClientUser } from '../entities/client-user.entity';
import { ClientPayment } from '../entities/client-payment.entity';
import { ClientLoyaltyService } from './client-loyalty.service';
import {
  CreateClientOrderDto,
  ClientOrderQueryDto,
  ClientOrderResponseDto,
} from '../dto/client-order.dto';
import { Machine } from '@/modules/machines/entities/machine.entity';
import { Nomenclature } from '@/modules/nomenclature/entities/nomenclature.entity';

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
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of dto.items) {
      const product = await this.nomenclatureRepository.findOne({
        where: { id: item.product_id },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const unitPrice = item.unit_price ?? 0;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product_id: product.id,
        name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
      });
    }

    // Calculate points redemption
    let pointsRedeemed = 0;
    let discountFromPoints = 0;

    if (dto.redeem_points && dto.redeem_points > 0) {
      const balance = await this.loyaltyService.getBalance(clientUser.id);
      const maxRedeemable = Math.min(dto.redeem_points, balance.points_balance);
      pointsRedeemed = maxRedeemable;
      // 1 point = 100 UZS
      discountFromPoints = pointsRedeemed * 100;
    }

    // Calculate final amount
    const discountAmount = discountFromPoints;
    const finalAmount = Math.max(0, totalAmount - discountAmount);

    // Calculate points to earn (1% of final amount)
    const pointsEarned = Math.floor(finalAmount / 1000);

    // Create order
    const order = this.orderRepository.create({
      client_user_id: clientUser.id,
      machine_id: dto.machine_id,
      status: ClientOrderStatus.PENDING,
      items: orderItems,
      currency: 'UZS',
      total_amount: finalAmount, // Use final amount as total
      loyalty_points_earned: pointsEarned,
      loyalty_points_used: pointsRedeemed,
      payment_provider: dto.payment_provider,
    });

    await this.orderRepository.save(order);

    // Update order status based on payment provider
    if (dto.payment_provider === PaymentProvider.WALLET) {
      // Wallet payment - mark as pending
      order.status = ClientOrderStatus.PENDING;
    } else {
      // External payment provider
      order.status = ClientOrderStatus.PENDING;
    }

    await this.orderRepository.save(order);

    return this.mapToResponseDto(order, machine);
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

    // TODO: Implement points refund if needed
    // Currently loyalty_points_used is tracked but refund logic is not implemented

    order.status = ClientOrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return this.mapToResponseDto(order, order.machine);
  }

  /**
   * Map order entity to response DTO
   */
  private mapToResponseDto(order: ClientOrder, machine?: Machine): ClientOrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      discount_amount: 0, // No discount column in entity
      final_amount: Number(order.total_amount), // Same as total since no discount
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
