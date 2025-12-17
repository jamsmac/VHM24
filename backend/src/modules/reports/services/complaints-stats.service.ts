import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Complaint,
  ComplaintType,
  ComplaintStatus,
} from '@modules/complaints/entities/complaint.entity';

export interface ComplaintsStatsReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_complaints: number;
    new: number;
    in_review: number;
    resolved: number;
    rejected: number;
    avg_resolution_time_hours: number;
    total_refunds: number;
    complaints_with_rating: number;
    avg_rating: number;
  };
  nps: {
    total_responses: number;
    promoters: number; // Rating 5
    passives: number; // Rating 4
    detractors: number; // Rating 1-3
    promoters_percentage: number;
    detractors_percentage: number;
    nps_score: number; // (% promoters - % detractors)
    category: 'excellent' | 'good' | 'fair' | 'poor'; // NPS interpretation
  };
  by_type: Array<{
    complaint_type: ComplaintType;
    count: number;
    percentage: number;
    avg_resolution_time_hours: number;
    total_refunds: number;
    resolved: number;
    rejected: number;
  }>;
  by_status: Array<{
    status: ComplaintStatus;
    count: number;
    percentage: number;
  }>;
  by_machine: Array<{
    machine_id: string;
    machine_number: string;
    machine_name: string;
    location_name: string;
    total_complaints: number;
    resolved: number;
    rejected: number;
    total_refunds: number;
    avg_rating: number;
    most_common_type: ComplaintType;
  }>;
  timeline: Array<{
    date: string; // YYYY-MM-DD
    submitted: number;
    resolved: number;
    rejected: number;
  }>;
  rating_distribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  top_refunds: Array<{
    id: string;
    complaint_type: ComplaintType;
    description: string;
    machine_number: string;
    refund_amount: number;
    submitted_at: Date;
    status: ComplaintStatus;
  }>;
  generated_at: Date;
}

@Injectable()
export class ComplaintsStatsService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
  ) {}

  /**
   * Generate comprehensive complaints statistics report with NPS
   */
  async generateReport(startDate: Date, endDate: Date): Promise<ComplaintsStatsReport> {
    const [complaints, byType, byStatus, byMachine, timeline, ratingDistribution] =
      await Promise.all([
        this.getComplaints(startDate, endDate),
        this.getComplaintsByType(startDate, endDate),
        this.getComplaintsByStatus(startDate, endDate),
        this.getComplaintsByMachine(startDate, endDate),
        this.getComplaintsTimeline(startDate, endDate),
        this.getRatingDistribution(startDate, endDate),
      ]);

    // Calculate summary
    const totalComplaints = complaints.length;
    const newComplaints = complaints.filter((c) => c.status === ComplaintStatus.NEW).length;
    const inReviewComplaints = complaints.filter(
      (c) => c.status === ComplaintStatus.IN_REVIEW,
    ).length;
    const resolvedComplaints = complaints.filter(
      (c) => c.status === ComplaintStatus.RESOLVED,
    ).length;
    const rejectedComplaints = complaints.filter(
      (c) => c.status === ComplaintStatus.REJECTED,
    ).length;

    const resolvedOrRejected = complaints.filter(
      (c) =>
        c.resolved_at &&
        (c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.REJECTED),
    );
    const avgResolutionTimeHours =
      resolvedOrRejected.length > 0
        ? resolvedOrRejected.reduce((sum, comp) => {
            const submittedAt = new Date(comp.submitted_at).getTime();
            const resolvedAt = new Date(comp.resolved_at!).getTime();
            const hours = (resolvedAt - submittedAt) / (1000 * 60 * 60);
            return sum + hours;
          }, 0) / resolvedOrRejected.length
        : 0;

    const totalRefunds = complaints.reduce((sum, comp) => sum + Number(comp.refund_amount || 0), 0);

    const complaintsWithRating = complaints.filter((c) => c.rating !== null);
    const avgRating =
      complaintsWithRating.length > 0
        ? complaintsWithRating.reduce((sum, c) => sum + Number(c.rating!), 0) /
          complaintsWithRating.length
        : 0;

    // Calculate NPS
    const nps = this.calculateNPS(complaints);

    // Get top refunds
    const topRefunds = this.getTopRefunds(complaints);

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_complaints: totalComplaints,
        new: newComplaints,
        in_review: inReviewComplaints,
        resolved: resolvedComplaints,
        rejected: rejectedComplaints,
        avg_resolution_time_hours: avgResolutionTimeHours,
        total_refunds: totalRefunds,
        complaints_with_rating: complaintsWithRating.length,
        avg_rating: avgRating,
      },
      nps,
      by_type: byType,
      by_status: byStatus,
      by_machine: byMachine,
      timeline,
      rating_distribution: ratingDistribution,
      top_refunds: topRefunds,
      generated_at: new Date(),
    };
  }

  /**
   * Get all complaints in period
   */
  private async getComplaints(startDate: Date, endDate: Date): Promise<Complaint[]> {
    return await this.complaintRepository.find({
      where: {
        // TypeORM Between with Date parameters requires type assertion due to generic inference
        submitted_at: Between(startDate, endDate) as ReturnType<typeof Between<Date>>,
      },
      relations: ['machine', 'machine.location'],
      order: { submitted_at: 'DESC' },
    });
  }

  /**
   * Calculate Net Promoter Score (NPS)
   *
   * Adapted for 1-5 rating scale:
   * - Promoters: Rating 5
   * - Passives: Rating 4
   * - Detractors: Rating 1-3
   *
   * NPS = (% Promoters - % Detractors)
   * Range: -100 to +100
   */
  private calculateNPS(complaints: Complaint[]): ComplaintsStatsReport['nps'] {
    const withRating = complaints.filter(
      (c) => c.rating !== null && c.rating >= 1 && c.rating <= 5,
    );
    const totalResponses = withRating.length;

    if (totalResponses === 0) {
      return {
        total_responses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        promoters_percentage: 0,
        detractors_percentage: 0,
        nps_score: 0,
        category: 'poor',
      };
    }

    const promoters = withRating.filter((c) => c.rating === 5).length;
    const passives = withRating.filter((c) => c.rating === 4).length;
    const detractors = withRating.filter((c) => c.rating! >= 1 && c.rating! <= 3).length;

    const promotersPercentage = (promoters / totalResponses) * 100;
    const detractorsPercentage = (detractors / totalResponses) * 100;
    const npsScore = promotersPercentage - detractorsPercentage;

    // NPS interpretation
    let category: 'excellent' | 'good' | 'fair' | 'poor';
    if (npsScore >= 70) {
      category = 'excellent'; // World-class
    } else if (npsScore >= 30) {
      category = 'good'; // Above average
    } else if (npsScore >= 0) {
      category = 'fair'; // Average
    } else {
      category = 'poor'; // Needs improvement
    }

    return {
      total_responses: totalResponses,
      promoters,
      passives,
      detractors,
      promoters_percentage: promotersPercentage,
      detractors_percentage: detractorsPercentage,
      nps_score: npsScore,
      category,
    };
  }

  /**
   * Get complaints grouped by type
   */
  private async getComplaintsByType(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplaintsStatsReport['by_type']> {
    const result = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.complaint_type', 'complaint_type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(*) FILTER (WHERE complaint.status = :resolved)', 'resolved')
      .addSelect('COUNT(*) FILTER (WHERE complaint.status = :rejected)', 'rejected')
      .addSelect('SUM(COALESCE(complaint.refund_amount, 0))', 'total_refunds')
      .addSelect(
        `AVG(EXTRACT(EPOCH FROM (complaint.resolved_at - complaint.submitted_at)) / 3600) FILTER (WHERE complaint.resolved_at IS NOT NULL)`,
        'avg_resolution_time_hours',
      )
      .where('complaint.submitted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('resolved', ComplaintStatus.RESOLVED)
      .setParameter('rejected', ComplaintStatus.REJECTED)
      .groupBy('complaint.complaint_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      complaint_type: r.complaint_type,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
      avg_resolution_time_hours: Number(r.avg_resolution_time_hours || 0),
      total_refunds: Number(r.total_refunds || 0),
      resolved: Number(r.resolved || 0),
      rejected: Number(r.rejected || 0),
    }));
  }

  /**
   * Get complaints grouped by status
   */
  private async getComplaintsByStatus(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplaintsStatsReport['by_status']> {
    const result = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.submitted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('complaint.status')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      status: r.status,
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
    }));
  }

  /**
   * Get complaints grouped by machine
   */
  private async getComplaintsByMachine(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplaintsStatsReport['by_machine']> {
    const result = await this.complaintRepository
      .createQueryBuilder('complaint')
      .leftJoin('complaint.machine', 'machine')
      .leftJoin('machine.location', 'location')
      .select('complaint.machine_id', 'machine_id')
      .addSelect('machine.machine_number', 'machine_number')
      .addSelect('machine.name', 'machine_name')
      .addSelect('location.name', 'location_name')
      .addSelect('COUNT(*)', 'total_complaints')
      .addSelect('COUNT(*) FILTER (WHERE complaint.status = :resolved)', 'resolved')
      .addSelect('COUNT(*) FILTER (WHERE complaint.status = :rejected)', 'rejected')
      .addSelect('SUM(COALESCE(complaint.refund_amount, 0))', 'total_refunds')
      .addSelect('AVG(complaint.rating) FILTER (WHERE complaint.rating IS NOT NULL)', 'avg_rating')
      .addSelect(
        `(
          SELECT complaint_type
          FROM complaints c2
          WHERE c2.machine_id = complaint.machine_id
            AND c2.submitted_at BETWEEN :startDate AND :endDate
          GROUP BY complaint_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )`,
        'most_common_type',
      )
      .where('complaint.submitted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('resolved', ComplaintStatus.RESOLVED)
      .setParameter('rejected', ComplaintStatus.REJECTED)
      .groupBy('complaint.machine_id')
      .addGroupBy('machine.machine_number')
      .addGroupBy('machine.name')
      .addGroupBy('location.name')
      .orderBy('total_complaints', 'DESC')
      .limit(20)
      .getRawMany();

    return result.map((r) => ({
      machine_id: r.machine_id,
      machine_number: r.machine_number || 'Unknown',
      machine_name: r.machine_name || 'Unknown',
      location_name: r.location_name || 'Unknown',
      total_complaints: Number(r.total_complaints),
      resolved: Number(r.resolved || 0),
      rejected: Number(r.rejected || 0),
      total_refunds: Number(r.total_refunds || 0),
      avg_rating: Number(r.avg_rating || 0),
      most_common_type: r.most_common_type || ComplaintType.OTHER,
    }));
  }

  /**
   * Get complaints timeline (daily breakdown)
   */
  private async getComplaintsTimeline(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplaintsStatsReport['timeline']> {
    const submitted = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select(`DATE(complaint.submitted_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.submitted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(complaint.submitted_at)')
      .orderBy('DATE(complaint.submitted_at)', 'ASC')
      .getRawMany();

    const resolved = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select(`DATE(complaint.resolved_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.resolved_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('complaint.resolved_at IS NOT NULL')
      .andWhere('complaint.status = :resolved', { resolved: ComplaintStatus.RESOLVED })
      .groupBy('DATE(complaint.resolved_at)')
      .getRawMany();

    const rejected = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select(`DATE(complaint.resolved_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.resolved_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('complaint.resolved_at IS NOT NULL')
      .andWhere('complaint.status = :rejected', { rejected: ComplaintStatus.REJECTED })
      .groupBy('DATE(complaint.resolved_at)')
      .getRawMany();

    // Merge all dates
    const datesMap = new Map<string, { submitted: number; resolved: number; rejected: number }>();

    submitted.forEach((r) => {
      const dateStr = r.date;
      datesMap.set(dateStr, { submitted: Number(r.count), resolved: 0, rejected: 0 });
    });

    resolved.forEach((r) => {
      const dateStr = r.date;
      const existing = datesMap.get(dateStr) || { submitted: 0, resolved: 0, rejected: 0 };
      existing.resolved = Number(r.count);
      datesMap.set(dateStr, existing);
    });

    rejected.forEach((r) => {
      const dateStr = r.date;
      const existing = datesMap.get(dateStr) || { submitted: 0, resolved: 0, rejected: 0 };
      existing.rejected = Number(r.count);
      datesMap.set(dateStr, existing);
    });

    return Array.from(datesMap.entries())
      .map(([date, data]) => ({
        date,
        submitted: data.submitted,
        resolved: data.resolved,
        rejected: data.rejected,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get rating distribution
   */
  private async getRatingDistribution(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplaintsStatsReport['rating_distribution']> {
    const result = await this.complaintRepository
      .createQueryBuilder('complaint')
      .select('complaint.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('complaint.submitted_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('complaint.rating IS NOT NULL')
      .groupBy('complaint.rating')
      .orderBy('complaint.rating', 'ASC')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return result.map((r) => ({
      rating: Number(r.rating),
      count: Number(r.count),
      percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
    }));
  }

  /**
   * Get top refunds for detailed view
   */
  private getTopRefunds(complaints: Complaint[]): ComplaintsStatsReport['top_refunds'] {
    const withRefunds = complaints.filter((c) => c.refund_amount && Number(c.refund_amount) > 0);

    return withRefunds
      .sort((a, b) => Number(b.refund_amount) - Number(a.refund_amount))
      .slice(0, 10)
      .map((comp) => ({
        id: comp.id,
        complaint_type: comp.complaint_type,
        description:
          comp.description.substring(0, 100) + (comp.description.length > 100 ? '...' : ''),
        machine_number: comp.machine?.machine_number || 'Unknown',
        refund_amount: Number(comp.refund_amount),
        submitted_at: new Date(comp.submitted_at),
        status: comp.status,
      }));
  }
}
