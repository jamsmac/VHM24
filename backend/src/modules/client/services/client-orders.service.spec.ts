import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';
import { ClientLoyaltyService } from './client-loyalty.service';
import { PromoCodesService } from '@/modules/promo-codes/promo-codes.service';
import {
  ClientOrder,
  ClientOrderStatus,
  PaymentProvider,
} from '../entities/client-order.entity';
import { ClientPayment } from '../entities/client-payment.entity';
import { ClientUser } from '../entities/client-user.entity';
import { Machine, MachineStatus } from '@/modules/machines/entities/machine.entity';
import { Nomenclature } from '@/modules/nomenclature/entities/nomenclature.entity';

describe('ClientOrdersService', () => {
  let service: ClientOrdersService;
  let orderRepository: jest.Mocked<Repository<ClientOrder>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let nomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let loyaltyService: jest.Mocked<ClientLoyaltyService>;
  let promoCodesService: jest.Mocked<PromoCodesService>;

  const mockClientUser: Partial<ClientUser> = {
    id: 'client-user-123',
    telegram_id: 123456789,
    full_name: 'Test User',
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-1',
    name: 'Test Machine',
    machine_number: 'M-001',
    status: MachineStatus.ACTIVE,
  };

  const mockOrder: Partial<ClientOrder> = {
    id: 'order-1',
    client_user_id: 'client-user-123',
    machine_id: 'machine-1',
    status: ClientOrderStatus.PENDING,
    items: [
      {
        product_id: 'product-1',
        product_name: 'Coffee',
        quantity: 2,
        price: 10000,
      },
    ],
    total_amount: 20000,
    loyalty_points_earned: 200,
    loyalty_points_used: 500,
    payment_provider: PaymentProvider.CLICK,
    created_at: new Date(),
    machine: mockMachine as Machine,
  };

  beforeEach(async () => {
    const mockOrderRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockPaymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockMachineRepo = {
      findOne: jest.fn(),
    };

    const mockNomenclatureRepo = {
      findOne: jest.fn(),
    };

    const mockLoyaltyService = {
      getBalance: jest.fn(),
      earnPoints: jest.fn(),
      redeemPoints: jest.fn(),
      refundPoints: jest.fn(),
    };

    const mockPromoCodesService = {
      validate: jest.fn(),
      applyToOrder: jest.fn(),
      findByCode: jest.fn(),
      calculateDiscount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientOrdersService,
        {
          provide: getRepositoryToken(ClientOrder),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(ClientPayment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepo,
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepo,
        },
        {
          provide: ClientLoyaltyService,
          useValue: mockLoyaltyService,
        },
        {
          provide: PromoCodesService,
          useValue: mockPromoCodesService,
        },
      ],
    }).compile();

    service = module.get<ClientOrdersService>(ClientOrdersService);
    orderRepository = module.get(getRepositoryToken(ClientOrder));
    machineRepository = module.get(getRepositoryToken(Machine));
    nomenclatureRepository = module.get(getRepositoryToken(Nomenclature));
    loyaltyService = module.get(ClientLoyaltyService);
    promoCodesService = module.get(PromoCodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order and refund loyalty points', async () => {
      const orderWithPoints = {
        ...mockOrder,
        loyalty_points_used: 500,
        status: ClientOrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(orderWithPoints as ClientOrder);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as ClientOrder),
      );
      loyaltyService.refundPoints.mockResolvedValue({
        id: 'ledger-1',
        delta: 500,
        reason: 'order_refund',
        balance_after: 1500,
      } as any);

      const result = await service.cancelOrder(
        mockClientUser as ClientUser,
        'order-1',
      );

      expect(result.status).toBe(ClientOrderStatus.CANCELLED);
      expect(loyaltyService.refundPoints).toHaveBeenCalledWith(
        'client-user-123',
        500,
        'order-1',
        expect.stringContaining('Points refunded for cancelled order'),
      );
    });

    it('should cancel order without refund when no points were used', async () => {
      const orderWithoutPoints = {
        ...mockOrder,
        loyalty_points_used: 0,
        status: ClientOrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(
        orderWithoutPoints as ClientOrder,
      );
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as ClientOrder),
      );

      const result = await service.cancelOrder(
        mockClientUser as ClientUser,
        'order-1',
      );

      expect(result.status).toBe(ClientOrderStatus.CANCELLED);
      expect(loyaltyService.refundPoints).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelOrder(mockClientUser as ClientUser, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending orders', async () => {
      const completedOrder = {
        ...mockOrder,
        status: ClientOrderStatus.COMPLETED,
      };

      orderRepository.findOne.mockResolvedValue(completedOrder as ClientOrder);

      await expect(
        service.cancelOrder(mockClientUser as ClientUser, 'order-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled orders', async () => {
      const cancelledOrder = {
        ...mockOrder,
        status: ClientOrderStatus.CANCELLED,
      };

      orderRepository.findOne.mockResolvedValue(cancelledOrder as ClientOrder);

      await expect(
        service.cancelOrder(mockClientUser as ClientUser, 'order-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only refund points for the specific client user', async () => {
      const orderWithPoints = {
        ...mockOrder,
        client_user_id: 'specific-user-123',
        loyalty_points_used: 300,
        status: ClientOrderStatus.PENDING,
      };

      orderRepository.findOne.mockResolvedValue(orderWithPoints as ClientOrder);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as ClientOrder),
      );
      loyaltyService.refundPoints.mockResolvedValue({} as any);

      await service.cancelOrder(
        { id: 'specific-user-123' } as ClientUser,
        'order-1',
      );

      expect(loyaltyService.refundPoints).toHaveBeenCalledWith(
        'specific-user-123',
        300,
        'order-1',
        expect.any(String),
      );
    });
  });

  describe('createOrder', () => {
    const createOrderDto = {
      machine_id: 'machine-1',
      items: [{ product_id: 'product-1', quantity: 2, unit_price: 10000 }],
      payment_provider: PaymentProvider.CLICK,
      redeem_points: 0,
    };

    beforeEach(() => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);
      nomenclatureRepository.findOne.mockResolvedValue({
        id: 'product-1',
        name: 'Coffee',
      } as Nomenclature);
      loyaltyService.getBalance.mockResolvedValue({
        points_balance: 1000,
        lifetime_points: 5000,
        points_value_uzs: 100000,
      });
      orderRepository.create.mockImplementation(
        (data) => data as unknown as ClientOrder,
      );
      orderRepository.save.mockImplementation((order) => {
        // Mutate the order object to simulate TypeORM behavior
        Object.assign(order, { id: 'new-order-1', created_at: new Date() });
        return Promise.resolve(order as ClientOrder);
      });
    });

    it('should create order with correct total amount', async () => {
      const result = await service.createOrder(
        mockClientUser as ClientUser,
        createOrderDto,
      );

      expect(result.total_amount).toBe(20000);
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should apply points redemption discount', async () => {
      const dtoWithPoints = {
        ...createOrderDto,
        redeem_points: 100, // 100 points = 10000 UZS discount
      };

      const result = await service.createOrder(
        mockClientUser as ClientUser,
        dtoWithPoints,
      );

      // total_amount is the original amount before discount
      expect(result.total_amount).toBe(20000);
      // final_amount is the amount after discount: 20000 - 10000 = 10000
      expect(result.final_amount).toBe(10000);
      // discount_amount should reflect the points discount
      expect(result.discount_amount).toBe(10000);
    });

    it('should throw NotFoundException for non-existent machine', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createOrder(mockClientUser as ClientUser, createOrderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive machine', async () => {
      machineRepository.findOne.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.OFFLINE,
      } as Machine);

      await expect(
        service.createOrder(mockClientUser as ClientUser, createOrderDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      nomenclatureRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createOrder(mockClientUser as ClientUser, createOrderDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [mockOrder as ClientOrder],
          1,
        ]),
      };

      orderRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getOrders(mockClientUser as ClientUser, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      orderRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getOrders(mockClientUser as ClientUser, {
        status: ClientOrderStatus.COMPLETED,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: ClientOrderStatus.COMPLETED,
      });
    });
  });

  describe('getOrder', () => {
    it('should return a single order by ID', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as ClientOrder);

      const result = await service.getOrder(
        mockClientUser as ClientUser,
        'order-1',
      );

      expect(result.id).toBe('order-1');
    });

    it('should throw NotFoundException for non-existent order', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getOrder(mockClientUser as ClientUser, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
