import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from '@modules/machines/entities/machine.entity';

/**
 * Note: Equipment depreciation is not yet implemented.
 * The equipment module currently handles components (hoppers, grinders, etc.)
 * but doesn't have a standalone Equipment entity with depreciation fields.
 * Equipment depreciation returns empty array until this is implemented.
 */

export interface DepreciationReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_assets: number;
    total_purchase_value: number;
    total_accumulated_depreciation: number;
    total_current_value: number;
    total_monthly_depreciation: number;
    depreciation_percentage: number;
  };
  machines: Array<{
    machine_number: string;
    machine_name: string;
    location_name: string;
    purchase_price: number;
    purchase_date: Date;
    depreciation_years: number;
    accumulated_depreciation: number;
    current_value: number;
    monthly_depreciation: number;
    last_depreciation_date: Date;
    months_depreciated: number;
    remaining_months: number;
    depreciation_percentage: number;
    status: string; // 'active', 'fully_depreciated'
  }>;
  equipment: Array<{
    equipment_name: string;
    serial_number: string;
    type: string;
    purchase_price: number;
    purchase_date: Date;
    depreciation_years: number;
    accumulated_depreciation: number;
    current_value: number;
    monthly_depreciation: number;
    status: string;
  }>;
  generated_at: Date;
}

@Injectable()
export class DepreciationReportService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {}

  /**
   * Generate depreciation report for all assets
   */
  async generateReport(startDate: Date, endDate: Date): Promise<DepreciationReport> {
    const [machines, equipment] = await Promise.all([
      this.getMachinesDepreciation(),
      this.getEquipmentDepreciation(),
    ]);

    // Calculate summary
    const totalPurchaseValue =
      machines.reduce((sum, m) => sum + m.purchase_price, 0) +
      equipment.reduce((sum, e) => sum + e.purchase_price, 0);

    const totalAccumulatedDepreciation =
      machines.reduce((sum, m) => sum + m.accumulated_depreciation, 0) +
      equipment.reduce((sum, e) => sum + e.accumulated_depreciation, 0);

    const totalCurrentValue = totalPurchaseValue - totalAccumulatedDepreciation;

    const totalMonthlyDepreciation =
      machines.reduce((sum, m) => sum + m.monthly_depreciation, 0) +
      equipment.reduce((sum, e) => sum + e.monthly_depreciation, 0);

    const depreciationPercentage =
      totalPurchaseValue > 0 ? (totalAccumulatedDepreciation / totalPurchaseValue) * 100 : 0;

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_assets: machines.length + equipment.length,
        total_purchase_value: totalPurchaseValue,
        total_accumulated_depreciation: totalAccumulatedDepreciation,
        total_current_value: totalCurrentValue,
        total_monthly_depreciation: totalMonthlyDepreciation,
        depreciation_percentage: depreciationPercentage,
      },
      machines,
      equipment,
      generated_at: new Date(),
    };
  }

  /**
   * Get depreciation data for machines
   */
  private async getMachinesDepreciation(): Promise<DepreciationReport['machines']> {
    const machines = await this.machineRepository.find({
      where: {},
      relations: ['location'],
    });

    return machines
      .filter((machine) => machine.purchase_price != null && machine.purchase_price > 0)
      .map((machine) => {
        const purchasePrice = Number(machine.purchase_price || 0);
        const depreciationYears = Number(machine.depreciation_years || 5);
        const accumulatedDepreciation = Number(machine.accumulated_depreciation || 0);
        const monthlyDepreciation = purchasePrice / (depreciationYears * 12);
        const currentValue = Math.max(0, purchasePrice - accumulatedDepreciation);

        // Calculate months depreciated
        const monthsDepreciated =
          monthlyDepreciation > 0 ? Math.floor(accumulatedDepreciation / monthlyDepreciation) : 0;
        const totalMonths = depreciationYears * 12;
        const remainingMonths = Math.max(0, totalMonths - monthsDepreciated);

        const depreciationPercentage =
          purchasePrice > 0 ? (accumulatedDepreciation / purchasePrice) * 100 : 0;

        const status = depreciationPercentage >= 100 ? 'fully_depreciated' : 'active';

        return {
          machine_number: machine.machine_number,
          machine_name: machine.name,
          location_name: machine.location?.name || 'Unknown',
          purchase_price: purchasePrice,
          purchase_date: machine.installation_date || machine.purchase_date || new Date(),
          depreciation_years: depreciationYears,
          accumulated_depreciation: accumulatedDepreciation,
          current_value: currentValue,
          monthly_depreciation: monthlyDepreciation,
          last_depreciation_date: machine.last_depreciation_date || new Date(),
          months_depreciated: monthsDepreciated,
          remaining_months: remainingMonths,
          depreciation_percentage: depreciationPercentage,
          status,
        };
      })
      .sort((a, b) => b.current_value - a.current_value);
  }

  /**
   * Get depreciation data for equipment
   *
   * Note: Returns empty array until Equipment entity with depreciation
   * fields is implemented. See module header comment for details.
   */
  private async getEquipmentDepreciation(): Promise<DepreciationReport['equipment']> {
    return [];
  }
}
