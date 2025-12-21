import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CommissionSchedulerService } from '../services/commission-scheduler.service';
import { RevenueAggregationService } from '../services/revenue-aggregation.service';
import { CommissionQueryDto } from '../dto/commission-query.dto';
import { MarkPaidDto, UpdatePaymentDto } from '../dto/mark-paid.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, In } from 'typeorm';
import { CommissionCalculation, PaymentStatus } from '../entities/commission-calculation.entity';
import { Contract } from '../entities/contract.entity';

/**
 * Commission Controller
 *
 * Provides REST API endpoints for commission management:
 * - List commissions with filters
 * - View pending/overdue commissions
 * - Mark commissions as paid
 * - Get commission statistics
 * - Trigger manual calculations
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionController {
  constructor(
    private readonly schedulerService: CommissionSchedulerService,
    private readonly revenueService: RevenueAggregationService,
    @InjectRepository(CommissionCalculation)
    private readonly calculationRepository: Repository<CommissionCalculation>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectQueue('commission-calculations')
    private readonly commissionQueue: Queue,
  ) {}

  /**
   * List all commission calculations with filters
   */
  @Get()
  @ApiOperation({ summary: 'Get all commission calculations' })
  @ApiResponse({
    status: 200,
    description: 'List of commission calculations',
  })
  async findAll(@Query() query: CommissionQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<CommissionCalculation> = {};

    if (filters.payment_status) {
      where.payment_status = filters.payment_status;
    }

    if (filters.contract_id) {
      where.contract_id = filters.contract_id;
    }

    if (filters.period_start_from || filters.period_start_to) {
      where.period_start = Between(
        filters.period_start_from ? new Date(filters.period_start_from) : new Date('1900-01-01'),
        filters.period_start_to ? new Date(filters.period_start_to) : new Date('2100-12-31'),
      );
    }

    const [items, total] = await this.calculationRepository.findAndCount({
      where,
      relations: ['contract', 'contract.counterparty'],
      order: {
        period_start: 'DESC',
        created_at: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending commission payments
   */
  @Get('pending')
  @ApiOperation({ summary: 'Get pending commission payments' })
  @ApiResponse({
    status: 200,
    description: 'List of pending/overdue commissions',
  })
  async getPending() {
    const commissions = await this.schedulerService.getPendingPayments();

    const totalPending = commissions
      .filter((c) => c.payment_status === PaymentStatus.PENDING)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const totalOverdue = commissions
      .filter((c) => c.payment_status === PaymentStatus.OVERDUE)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return {
      items: commissions,
      summary: {
        total_count: commissions.length,
        pending_count: commissions.filter((c) => c.payment_status === PaymentStatus.PENDING).length,
        overdue_count: commissions.filter((c) => c.payment_status === PaymentStatus.OVERDUE).length,
        total_pending_amount: totalPending,
        total_overdue_amount: totalOverdue,
        total_amount: totalPending + totalOverdue,
      },
    };
  }

  /**
   * Get overdue commission payments
   */
  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue commission payments' })
  @ApiResponse({
    status: 200,
    description: 'List of overdue commissions',
  })
  async getOverdue() {
    const commissions = await this.schedulerService.getOverduePayments();

    const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return {
      items: commissions,
      summary: {
        total_count: commissions.length,
        total_amount: totalAmount,
      },
    };
  }

  /**
   * Get commission statistics for dashboard
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get commission statistics' })
  @ApiResponse({
    status: 200,
    description: 'Commission statistics',
  })
  async getStats() {
    const pending = await this.calculationRepository.find({
      where: {
        payment_status: In(['pending', 'overdue']),
      },
    });

    const paidThisMonth = await this.calculationRepository
      .createQueryBuilder('cc')
      .where('cc.payment_status = :status', { status: 'paid' })
      .andWhere('cc.payment_date >= :start', {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      })
      .andWhere('cc.payment_date < :end', {
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      })
      .getMany();

    const totalPending = pending
      .filter((c) => c.payment_status === PaymentStatus.PENDING)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const totalOverdue = pending
      .filter((c) => c.payment_status === PaymentStatus.OVERDUE)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const totalPaidThisMonth = paidThisMonth.reduce(
      (sum, c) => sum + Number(c.commission_amount),
      0,
    );

    // Calculate average days to payment
    const paidWithDate = paidThisMonth.filter((c) => c.payment_date && c.payment_due_date);
    const avgDaysToPayment =
      paidWithDate.length > 0
        ? paidWithDate.reduce((sum, c) => {
            const dueDate = new Date(c.payment_due_date!);
            const paidDate = new Date(c.payment_date!);
            const days = Math.ceil(
              (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / paidWithDate.length
        : 0;

    // Group by contract
    const byContract = await this.calculationRepository
      .createQueryBuilder('cc')
      .select('cc.contract_id', 'contract_id')
      .addSelect('c.contract_number', 'contract_number')
      .addSelect('COUNT(cc.id)', 'pending_count')
      .addSelect('SUM(cc.commission_amount)', 'pending_amount')
      .leftJoin('cc.contract', 'c')
      .where('cc.payment_status IN (:...statuses)', {
        statuses: ['pending', 'overdue'],
      })
      .groupBy('cc.contract_id, c.contract_number')
      .getRawMany();

    return {
      total_pending: pending.filter((c) => c.payment_status === PaymentStatus.PENDING).length,
      total_pending_amount: totalPending,
      total_overdue: pending.filter((c) => c.payment_status === PaymentStatus.OVERDUE).length,
      total_overdue_amount: totalOverdue,
      total_paid_this_month: paidThisMonth.length,
      total_paid_amount_this_month: totalPaidThisMonth,
      average_days_to_payment: Math.round(avgDaysToPayment * 10) / 10,
      by_contract: byContract.map((row) => ({
        contract_id: row.contract_id,
        contract_number: row.contract_number,
        pending_count: parseInt(row.pending_count, 10),
        pending_amount: parseFloat(row.pending_amount || '0'),
      })),
    };
  }

  /**
   * Get single commission calculation by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get commission calculation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission calculation details',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const commission = await this.calculationRepository.findOne({
      where: { id },
      relations: ['contract', 'contract.counterparty'],
    });

    if (!commission) {
      throw new Error('Commission calculation not found');
    }

    return commission;
  }

  /**
   * Get all commissions for a specific contract
   */
  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get all commissions for a contract' })
  @ApiResponse({
    status: 200,
    description: 'List of commissions for the contract',
  })
  async findByContract(@Param('contractId', ParseUUIDPipe) contractId: string) {
    const commissions = await this.calculationRepository.find({
      where: { contract_id: contractId },
      relations: ['contract', 'contract.counterparty'],
      order: {
        period_start: 'DESC',
      },
    });

    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const totalRevenue = commissions.reduce((sum, c) => sum + Number(c.total_revenue), 0);

    return {
      items: commissions,
      summary: {
        total_count: commissions.length,
        total_commission: totalCommission,
        total_revenue: totalRevenue,
        pending_count: commissions.filter((c) => c.payment_status === PaymentStatus.PENDING).length,
        paid_count: commissions.filter((c) => c.payment_status === PaymentStatus.PAID).length,
      },
    };
  }

  /**
   * Mark commission as paid
   */
  @Patch(':id/mark-paid')
  @Roles('Admin', 'MANAGER', 'Owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark commission calculation as paid' })
  @ApiResponse({
    status: 200,
    description: 'Commission marked as paid',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  async markAsPaid(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkPaidDto) {
    const paymentDate = dto.payment_date ? new Date(dto.payment_date) : new Date();

    const updated = await this.schedulerService.markAsPaid(
      id,
      dto.payment_transaction_id || null,
      paymentDate,
    );

    return {
      message: 'Commission marked as paid successfully',
      commission: updated,
    };
  }

  /**
   * Update payment details
   */
  @Patch(':id/payment')
  @Roles('Admin', 'MANAGER', 'Owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payment details' })
  @ApiResponse({
    status: 200,
    description: 'Payment details updated',
  })
  async updatePayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePaymentDto) {
    const commission = await this.calculationRepository.findOne({
      where: { id },
    });

    if (!commission) {
      throw new Error('Commission calculation not found');
    }

    if (dto.payment_status) {
      commission.payment_status = dto.payment_status;
    }

    if (dto.payment_due_date) {
      commission.payment_due_date = new Date(dto.payment_due_date);
    }

    if (dto.payment_transaction_id) {
      commission.payment_transaction_id = dto.payment_transaction_id;
    }

    if (dto.payment_date) {
      commission.payment_date = new Date(dto.payment_date);
    }

    if (dto.notes) {
      commission.notes = dto.notes;
    }

    const updated = await this.calculationRepository.save(commission);

    return {
      message: 'Payment details updated successfully',
      commission: updated,
    };
  }

  /**
   * Trigger manual commission calculation (admin only)
   *
   * Adds a job to the BullMQ queue for async processing.
   * Returns immediately with job ID for tracking.
   */
  @Post('calculate-now')
  @Roles('Admin', 'Owner')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger manual commission calculation (admin only)',
  })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'all'],
    required: false,
    description: 'Period type to calculate. Defaults to "all"',
  })
  @ApiResponse({
    status: 202,
    description: 'Calculation job queued successfully',
  })
  async calculateNow(@Query('period') period?: string) {
    // Add job to queue for async processing
    const job = await this.commissionQueue.add('calculate-manual', {
      period: period || 'all',
    });

    return {
      message: 'Commission calculation job queued',
      job_id: job.id,
      period: period || 'all',
      status: 'queued',
      note: 'Use GET /commissions/jobs/:jobId to check status',
    };
  }

  /**
   * Get job status for a commission calculation
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get commission calculation job status' })
  @ApiResponse({
    status: 200,
    description: 'Job status information',
  })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.commissionQueue.getJob(jobId);

    if (!job) {
      return {
        error: 'Job not found',
        job_id: jobId,
      };
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      job_id: job.id,
      state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
      progress,
      result,
      failed_reason: failedReason,
      created_at: new Date(job.timestamp),
      processed_on: job.processedOn ? new Date(job.processedOn) : null,
      finished_on: job.finishedOn ? new Date(job.finishedOn) : null,
    };
  }

  /**
   * Check and update overdue payments
   */
  @Post('check-overdue')
  @Roles('Admin', 'MANAGER', 'Owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check and mark overdue payments' })
  @ApiResponse({
    status: 200,
    description: 'Overdue check completed',
  })
  async checkOverdue() {
    const count = await this.schedulerService.checkAndUpdateOverduePayments();

    return {
      message: 'Overdue check completed',
      updated_count: count,
    };
  }
}
