import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request, Response } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * BullMQ Board Controller
 *
 * Provides a web UI for monitoring BullMQ queues
 * Protected by JWT auth and admin role requirement
 */
@ApiTags('Admin - Queue Monitoring')
@ApiBearerAuth('JWT-auth')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admins can access queue monitoring
export class BullBoardController {
  private serverAdapter: ExpressAdapter;

  constructor(
    // TODO: Re-enable when commission module is implemented
    // @InjectQueue('commission-calculations')
    // private commissionQueue: Queue,
    @InjectQueue('sales-import')
    private salesImportQueue: Queue,
  ) {
    // Create Express adapter for Bull Board
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    // Create Bull Board with all queues
    createBullBoard({
      queues: [
        // TODO: Re-enable when commission module is implemented
        // new BullAdapter(this.commissionQueue),
        new BullAdapter(this.salesImportQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Handle all requests to /admin/queues/*
   * Delegates to Bull Board UI
   */
  @All('{*path}')
  admin(@Req() req: Request, @Res() res: Response) {
    const handler = this.serverAdapter.getRouter();
    handler(req, res);
  }
}
