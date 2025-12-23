import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PromoCode, PromoCodeRedemption } from './entities';
import { PromoCodeType, PromoCodeStatus } from './enums';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
  ValidatePromoCodeResponseDto,
  PromoCodeQueryDto,
} from './dto';

export interface PromoCodeStats {
  total_redemptions: number;
  total_discount_given: number;
  total_bonus_awarded: number;
  unique_users: number;
  redemptions_by_day: Array<{ date: string; count: number; discount: number }>;
}

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoCodeRepository: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private readonly redemptionRepository: Repository<PromoCodeRedemption>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new promo code
   */
  async create(dto: CreatePromoCodeDto, createdById: string): Promise<PromoCode> {
    // Check if code already exists
    const existing = await this.promoCodeRepository.findOne({
      where: { code: dto.code.toUpperCase() },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(`Promo code "${dto.code}" already exists`);
    }

    // Validate percentage value
    if (dto.type === PromoCodeType.PERCENTAGE && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const promoCode = this.promoCodeRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
      valid_from: new Date(dto.valid_from),
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
      status: dto.status || PromoCodeStatus.DRAFT,
      created_by_id: createdById,
    });

    return this.promoCodeRepository.save(promoCode);
  }

  /**
   * Find all promo codes with filters
   */
  async findAll(query: PromoCodeQueryDto): Promise<{ data: PromoCode[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      organization_id,
      active_only,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = query;

    const qb = this.promoCodeRepository.createQueryBuilder('promo');

    // Search filter
    if (search) {
      qb.andWhere('(promo.code ILIKE :search OR promo.name ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Status filter
    if (status) {
      qb.andWhere('promo.status = :status', { status });
    }

    // Type filter
    if (type) {
      qb.andWhere('promo.type = :type', { type });
    }

    // Organization filter
    if (organization_id) {
      qb.andWhere('promo.organization_id = :organization_id', { organization_id });
    }

    // Active only filter
    if (active_only) {
      const now = new Date();
      qb.andWhere('promo.status = :activeStatus', { activeStatus: PromoCodeStatus.ACTIVE })
        .andWhere('promo.valid_from <= :now', { now })
        .andWhere('(promo.valid_until IS NULL OR promo.valid_until >= :now)', { now })
        .andWhere('(promo.max_uses IS NULL OR promo.current_uses < promo.max_uses)');
    }

    // Soft delete filter
    qb.andWhere('promo.deleted_at IS NULL');

    // Sorting
    const validSortFields = ['created_at', 'code', 'status', 'type', 'valid_from', 'current_uses'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    qb.orderBy(`promo.${sortField}`, sort_order === 'ASC' ? 'ASC' : 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  /**
   * Find one promo code by ID
   */
  async findOne(id: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id },
      relations: ['created_by', 'organization'],
    });

    if (!promoCode) {
      throw new NotFoundException(`Promo code with ID "${id}" not found`);
    }

    return promoCode;
  }

  /**
   * Find promo code by code string
   */
  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoCodeRepository.findOne({
      where: { code: code.toUpperCase() },
    });
  }

  /**
   * Update a promo code
   */
  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promoCode = await this.findOne(id);

    // Validate percentage value
    if (dto.type === PromoCodeType.PERCENTAGE && dto.value && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // Update fields
    Object.assign(promoCode, {
      ...dto,
      valid_from: dto.valid_from ? new Date(dto.valid_from) : promoCode.valid_from,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : promoCode.valid_until,
    });

    return this.promoCodeRepository.save(promoCode);
  }

  /**
   * Soft delete a promo code
   */
  async remove(id: string): Promise<void> {
    const promoCode = await this.findOne(id);
    await this.promoCodeRepository.softRemove(promoCode);
  }

  /**
   * Validate a promo code for a client
   */
  async validate(
    dto: ValidatePromoCodeDto,
    clientUserId: string,
  ): Promise<ValidatePromoCodeResponseDto> {
    const promoCode = await this.findByCode(dto.code);

    if (!promoCode) {
      return { valid: false, error: 'Промокод не найден' };
    }

    // Check if active
    if (!promoCode.isValid()) {
      if (promoCode.status === PromoCodeStatus.DRAFT) {
        return { valid: false, error: 'Промокод ещё не активирован' };
      }
      if (promoCode.status === PromoCodeStatus.PAUSED) {
        return { valid: false, error: 'Промокод временно приостановлен' };
      }
      if (promoCode.status === PromoCodeStatus.EXPIRED) {
        return { valid: false, error: 'Срок действия промокода истёк' };
      }
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return { valid: false, error: 'Лимит использования промокода исчерпан' };
      }
      return { valid: false, error: 'Промокод недействителен' };
    }

    // Check user usage limit
    const userRedemptions = await this.redemptionRepository.count({
      where: {
        promo_code_id: promoCode.id,
        client_user_id: clientUserId,
      },
    });

    if (userRedemptions >= promoCode.max_uses_per_user) {
      return { valid: false, error: 'Вы уже использовали этот промокод' };
    }

    // Check minimum order amount
    if (dto.order_amount && promoCode.minimum_order_amount) {
      if (dto.order_amount < promoCode.minimum_order_amount) {
        return {
          valid: false,
          error: `Минимальная сумма заказа: ${promoCode.minimum_order_amount.toLocaleString()} UZS`,
        };
      }
    }

    // Check applicable machines
    if (dto.machine_id && promoCode.applicable_machines?.length) {
      if (!promoCode.applicable_machines.includes(dto.machine_id)) {
        return { valid: false, error: 'Промокод недействителен для этого автомата' };
      }
    }

    // Check applicable locations
    if (dto.location_id && promoCode.applicable_locations?.length) {
      if (!promoCode.applicable_locations.includes(dto.location_id)) {
        return { valid: false, error: 'Промокод недействителен для этой локации' };
      }
    }

    // Check applicable products
    if (dto.product_ids?.length && promoCode.applicable_products?.length) {
      const hasApplicableProduct = dto.product_ids.some((id) =>
        promoCode.applicable_products?.includes(id),
      );
      if (!hasApplicableProduct) {
        return { valid: false, error: 'Промокод не применим к товарам в заказе' };
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(promoCode, dto.order_amount || 0);
    const bonusPoints =
      promoCode.type === PromoCodeType.LOYALTY_BONUS ? Math.floor(promoCode.value) : 0;

    return {
      valid: true,
      promo_code_id: promoCode.id,
      type: promoCode.type,
      value: promoCode.value,
      discount_amount: discountAmount,
      bonus_points: bonusPoints,
      description: promoCode.description || promoCode.name || undefined,
    };
  }

  /**
   * Calculate discount amount based on promo type
   */
  calculateDiscount(promoCode: PromoCode, orderAmount: number): number {
    switch (promoCode.type) {
      case PromoCodeType.PERCENTAGE: {
        const discount = orderAmount * (Number(promoCode.value) / 100);
        return promoCode.maximum_discount
          ? Math.min(discount, Number(promoCode.maximum_discount))
          : discount;
      }
      case PromoCodeType.FIXED_AMOUNT: {
        return Math.min(Number(promoCode.value), orderAmount);
      }
      case PromoCodeType.LOYALTY_BONUS: {
        return 0; // Bonus points are awarded after order completion
      }
      default:
        return 0;
    }
  }

  /**
   * Apply promo code to an order (creates redemption record and increments usage)
   */
  async applyToOrder(
    promoCodeId: string,
    clientUserId: string,
    orderId: string,
    discountApplied: number,
    loyaltyBonusAwarded: number = 0,
  ): Promise<PromoCodeRedemption> {
    return this.dataSource.transaction(async (manager) => {
      const promoCodeRepo = manager.getRepository(PromoCode);
      const redemptionRepo = manager.getRepository(PromoCodeRedemption);

      // Lock and get promo code
      const promoCode = await promoCodeRepo.findOne({
        where: { id: promoCodeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!promoCode) {
        throw new NotFoundException('Promo code not found');
      }

      // Increment usage count
      await promoCodeRepo.increment({ id: promoCodeId }, 'current_uses', 1);

      // Auto-expire if max uses reached
      if (promoCode.max_uses && promoCode.current_uses + 1 >= promoCode.max_uses) {
        await promoCodeRepo.update(promoCodeId, { status: PromoCodeStatus.EXPIRED });
      }

      // Create redemption record
      const redemption = redemptionRepo.create({
        promo_code_id: promoCodeId,
        client_user_id: clientUserId,
        order_id: orderId,
        discount_applied: discountApplied,
        loyalty_bonus_awarded: loyaltyBonusAwarded,
      });

      return redemptionRepo.save(redemption);
    });
  }

  /**
   * Get statistics for a promo code
   */
  async getStats(id: string): Promise<PromoCodeStats> {
    // Validate promo code exists
    await this.findOne(id);

    const redemptions = await this.redemptionRepository.find({
      where: { promo_code_id: id },
    });

    const uniqueUsers = new Set(redemptions.map((r) => r.client_user_id)).size;
    const totalDiscount = redemptions.reduce((sum, r) => sum + Number(r.discount_applied), 0);
    const totalBonus = redemptions.reduce((sum, r) => sum + r.loyalty_bonus_awarded, 0);

    // Group by day
    const byDay = new Map<string, { count: number; discount: number }>();
    for (const r of redemptions) {
      const date = r.created_at.toISOString().split('T')[0];
      const existing = byDay.get(date) || { count: 0, discount: 0 };
      byDay.set(date, {
        count: existing.count + 1,
        discount: existing.discount + Number(r.discount_applied),
      });
    }

    const redemptionsByDay = Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_redemptions: redemptions.length,
      total_discount_given: totalDiscount,
      total_bonus_awarded: totalBonus,
      unique_users: uniqueUsers,
      redemptions_by_day: redemptionsByDay,
    };
  }

  /**
   * Activate a promo code
   */
  async activate(id: string): Promise<PromoCode> {
    const promoCode = await this.findOne(id);

    if (promoCode.status === PromoCodeStatus.ACTIVE) {
      throw new BadRequestException('Promo code is already active');
    }

    promoCode.status = PromoCodeStatus.ACTIVE;
    return this.promoCodeRepository.save(promoCode);
  }

  /**
   * Pause a promo code
   */
  async pause(id: string): Promise<PromoCode> {
    const promoCode = await this.findOne(id);

    if (promoCode.status !== PromoCodeStatus.ACTIVE) {
      throw new BadRequestException('Only active promo codes can be paused');
    }

    promoCode.status = PromoCodeStatus.PAUSED;
    return this.promoCodeRepository.save(promoCode);
  }

  /**
   * Check and expire outdated promo codes (can be called by cron)
   */
  async expireOutdatedCodes(): Promise<number> {
    const now = new Date();

    const result = await this.promoCodeRepository
      .createQueryBuilder()
      .update(PromoCode)
      .set({ status: PromoCodeStatus.EXPIRED })
      .where('status = :activeStatus', { activeStatus: PromoCodeStatus.ACTIVE })
      .andWhere('valid_until IS NOT NULL')
      .andWhere('valid_until < :now', { now })
      .execute();

    return result.affected || 0;
  }
}
