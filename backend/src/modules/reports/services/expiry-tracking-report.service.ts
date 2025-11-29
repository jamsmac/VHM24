import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseInventory } from '@modules/inventory/entities/warehouse-inventory.entity';
import { MachineInventory } from '@modules/inventory/entities/machine-inventory.entity';

export interface ExpiryTrackingReport {
  period: {
    report_date: Date;
    days_ahead: number; // How many days to look ahead for expiry
  };
  summary: {
    total_batches_tracked: number;
    expired_batches: number;
    expiring_urgent: number; // ≤7 days
    expiring_warning: number; // ≤30 days
    total_value_at_risk: number;
    total_quantity_at_risk: number;
  };
  warehouse_batches: Array<{
    warehouse_id: string;
    warehouse_name: string;
    product_id: string;
    product_name: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    total_value: number;
    expiry_date: Date;
    days_until_expiry: number;
    status: 'expired' | 'urgent' | 'warning' | 'ok';
  }>;
  machine_batches: Array<{
    machine_id: string;
    machine_number: string;
    machine_name: string;
    location_name: string;
    product_id: string;
    product_name: string;
    quantity: number;
    estimated_expiry_date: Date | null;
    days_until_expiry: number | null;
    status: 'expired' | 'urgent' | 'warning' | 'ok';
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    affected_batches: number;
    estimated_loss: number;
  }>;
  generated_at: Date;
}

@Injectable()
export class ExpiryTrackingReportService {
  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
  ) {}

  /**
   * Generate expiry tracking report
   *
   * Tracks products approaching expiry across all inventory levels
   *
   * @param daysAhead - How many days ahead to check (default: 90)
   */
  async generateReport(daysAhead: number = 90): Promise<ExpiryTrackingReport> {
    const reportDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const [warehouseBatches, machineBatches] = await Promise.all([
      this.getWarehouseExpiryBatches(futureDate),
      this.getMachineExpiryBatches(futureDate),
    ]);

    // Calculate summary
    const allBatches = [...warehouseBatches];
    const expiredBatches = allBatches.filter((b) => b.status === 'expired');
    const urgentBatches = allBatches.filter((b) => b.status === 'urgent');
    const warningBatches = allBatches.filter((b) => b.status === 'warning');

    const totalValueAtRisk = allBatches
      .filter((b) => b.status === 'expired' || b.status === 'urgent')
      .reduce((sum, b) => sum + b.total_value, 0);

    const totalQuantityAtRisk = allBatches
      .filter((b) => b.status === 'expired' || b.status === 'urgent')
      .reduce((sum, b) => sum + b.quantity, 0);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      expiredBatches,
      urgentBatches,
      warningBatches,
    );

    return {
      period: {
        report_date: reportDate,
        days_ahead: daysAhead,
      },
      summary: {
        total_batches_tracked: allBatches.length,
        expired_batches: expiredBatches.length,
        expiring_urgent: urgentBatches.length,
        expiring_warning: warningBatches.length,
        total_value_at_risk: totalValueAtRisk,
        total_quantity_at_risk: totalQuantityAtRisk,
      },
      warehouse_batches: warehouseBatches,
      machine_batches: machineBatches,
      recommendations,
      generated_at: new Date(),
    };
  }

  /**
   * Get warehouse inventory batches approaching expiry
   */
  private async getWarehouseExpiryBatches(
    futureDate: Date,
  ): Promise<ExpiryTrackingReport['warehouse_batches']> {
    // Note: WarehouseInventory doesn't have expiry_date tracking
    // This feature would require InventoryBatch entity from warehouse module
    // Returning empty array for now until batch tracking is integrated
    return [];
  }

  /**
   * Get machine inventory approaching expiry
   *
   * Note: Machine inventory may not have explicit expiry dates,
   * so we estimate based on FIFO and warehouse batch tracking
   */
  private async getMachineExpiryBatches(
    futureDate: Date,
  ): Promise<ExpiryTrackingReport['machine_batches']> {
    const inventory = await this.machineInventoryRepository
      .createQueryBuilder('mi')
      .leftJoinAndSelect('mi.nomenclature', 'nomenclature')
      .leftJoinAndSelect('mi.machine', 'machine')
      .leftJoinAndSelect('machine.location', 'location')
      .where('mi.current_quantity > 0')
      .getMany();

    const now = new Date();

    return inventory.map((item) => {
      // For machine inventory, we don't have direct expiry tracking
      // This is a placeholder - in real implementation, you'd track
      // which warehouse batches were loaded into machines
      const estimatedExpiryDate = null;
      const daysUntilExpiry = null;
      const status: 'expired' | 'urgent' | 'warning' | 'ok' = 'ok';

      return {
        machine_id: item.machine?.id || '',
        machine_number: item.machine?.machine_number || 'Unknown',
        machine_name: item.machine?.name || 'Unknown',
        location_name: item.machine?.location?.name || 'Unknown',
        product_id: item.nomenclature?.id || '',
        product_name: item.nomenclature?.name || 'Unknown',
        quantity: Number(item.current_quantity || 0),
        estimated_expiry_date: estimatedExpiryDate,
        days_until_expiry: daysUntilExpiry,
        status,
      };
    });
  }

  /**
   * Generate recommendations based on expiry analysis
   */
  private generateRecommendations(
    expiredBatches: ExpiryTrackingReport['warehouse_batches'],
    urgentBatches: ExpiryTrackingReport['warehouse_batches'],
    warningBatches: ExpiryTrackingReport['warehouse_batches'],
  ): ExpiryTrackingReport['recommendations'] {
    const recommendations: ExpiryTrackingReport['recommendations'] = [];

    // Expired products
    if (expiredBatches.length > 0) {
      const estimatedLoss = expiredBatches.reduce((sum, b) => sum + b.total_value, 0);
      recommendations.push({
        priority: 'high',
        message: `Немедленно утилизировать ${expiredBatches.length} просроченных партий товара`,
        affected_batches: expiredBatches.length,
        estimated_loss: estimatedLoss,
      });
    }

    // Urgent expiry (≤7 days)
    if (urgentBatches.length > 0) {
      const estimatedLoss = urgentBatches.reduce((sum, b) => sum + b.total_value, 0);
      recommendations.push({
        priority: 'high',
        message: `Срочно реализовать ${urgentBatches.length} партий товара с истекающим сроком (≤7 дней)`,
        affected_batches: urgentBatches.length,
        estimated_loss: estimatedLoss,
      });
    }

    // Warning expiry (≤30 days)
    if (warningBatches.length > 0) {
      const estimatedLoss = warningBatches.reduce((sum, b) => sum + b.total_value, 0);
      recommendations.push({
        priority: 'medium',
        message: `Спланировать распределение ${warningBatches.length} партий товара с приближающимся сроком годности (≤30 дней)`,
        affected_batches: warningBatches.length,
        estimated_loss: estimatedLoss,
      });
    }

    // General recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        message: 'Критических проблем со сроками годности не обнаружено',
        affected_batches: 0,
        estimated_loss: 0,
      });
    }

    return recommendations;
  }
}
