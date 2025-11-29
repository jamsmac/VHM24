import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentsStatsService } from './incidents-stats.service';
import {
  Incident,
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from '@modules/incidents/entities/incident.entity';

describe('IncidentsStatsService', () => {
  let service: IncidentsStatsService;
  let repository: jest.Mocked<Repository<Incident>>;

  const mockIncident: Partial<Incident> = {
    id: 'incident-uuid',
    machine_id: 'machine-uuid',
    incident_type: IncidentType.TECHNICAL_FAILURE,
    title: 'Machine malfunction',
    description: 'Coffee dispenser not working',
    priority: IncidentPriority.HIGH,
    status: IncidentStatus.OPEN,
    reported_at: new Date('2025-01-15T10:00:00'),
    resolved_at: null,
    repair_cost: 0,
    machine: {
      id: 'machine-uuid',
      machine_number: 'M-001',
      name: 'Coffee Machine',
      location: {
        id: 'location-uuid',
        name: 'Office Building A',
      },
    } as any,
  };

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    const mockRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsStatsService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IncidentsStatsService>(IncidentsStatsService);
    repository = module.get(getRepositoryToken(Incident));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate comprehensive incidents report', async () => {
      const incidents = [
        mockIncident,
        { ...mockIncident, id: 'inc-2', status: IncidentStatus.RESOLVED, resolved_at: new Date() },
        { ...mockIncident, id: 'inc-3', status: IncidentStatus.IN_PROGRESS },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([{ incident_type: IncidentType.TECHNICAL_FAILURE, count: '3' }]) // byType
        .mockResolvedValueOnce([{ status: IncidentStatus.OPEN, count: '1' }]) // byStatus
        .mockResolvedValueOnce([{ priority: IncidentPriority.HIGH, count: '3' }]) // byPriority
        .mockResolvedValueOnce([{ machine_id: 'machine-uuid', total_incidents: '3' }]) // byMachine
        .mockResolvedValueOnce([{ date: '2025-01-15', count: '3' }]) // timeline reported
        .mockResolvedValueOnce([{ date: '2025-01-16', count: '1' }]) // timeline resolved
        .mockResolvedValueOnce([]); // timeline closed

      const result = await service.generateReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.summary).toBeDefined();
      expect(result.summary.total_incidents).toBe(3);
      expect(result.summary.open).toBe(1);
      expect(result.summary.in_progress).toBe(1);
      expect(result.summary.resolved).toBe(1);
      expect(result.generated_at).toBeDefined();
    });

    it('should calculate average resolution time for resolved incidents', async () => {
      const resolvedIncident = {
        ...mockIncident,
        status: IncidentStatus.RESOLVED,
        reported_at: new Date('2025-01-15T10:00:00'),
        resolved_at: new Date('2025-01-15T14:00:00'), // 4 hours later
      };

      repository.find.mockResolvedValue([resolvedIncident] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.avg_resolution_time_hours).toBeCloseTo(4, 0);
    });

    it('should calculate total repair costs', async () => {
      const incidentWithCost = {
        ...mockIncident,
        repair_cost: 150.5,
      };

      const incidentWithCost2 = {
        ...mockIncident,
        id: 'inc-2',
        repair_cost: 200,
      };

      repository.find.mockResolvedValue([incidentWithCost, incidentWithCost2] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_repair_costs).toBeCloseTo(350.5, 1);
    });

    it('should count incidents by priority', async () => {
      const incidents = [
        { ...mockIncident, priority: IncidentPriority.CRITICAL },
        { ...mockIncident, id: 'inc-2', priority: IncidentPriority.HIGH },
        { ...mockIncident, id: 'inc-3', priority: IncidentPriority.HIGH },
        { ...mockIncident, id: 'inc-4', priority: IncidentPriority.MEDIUM },
        { ...mockIncident, id: 'inc-5', priority: IncidentPriority.LOW },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.incidents_by_priority.critical).toBe(1);
      expect(result.summary.incidents_by_priority.high).toBe(2);
      expect(result.summary.incidents_by_priority.medium).toBe(1);
      expect(result.summary.incidents_by_priority.low).toBe(1);
    });

    it('should include critical incidents in detail', async () => {
      const criticalIncident = {
        ...mockIncident,
        priority: IncidentPriority.CRITICAL,
        status: IncidentStatus.OPEN,
      };

      repository.find.mockResolvedValue([criticalIncident] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.critical_incidents.length).toBe(1);
      expect(result.critical_incidents[0].id).toBe('incident-uuid');
      expect(result.critical_incidents[0].incident_type).toBe(IncidentType.TECHNICAL_FAILURE);
    });

    it('should exclude closed critical incidents from detail', async () => {
      const closedCriticalIncident = {
        ...mockIncident,
        priority: IncidentPriority.CRITICAL,
        status: IncidentStatus.CLOSED,
      };

      repository.find.mockResolvedValue([closedCriticalIncident] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.critical_incidents.length).toBe(0);
    });

    it('should handle empty period with no incidents', async () => {
      repository.find.mockResolvedValue([]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_incidents).toBe(0);
      expect(result.summary.avg_resolution_time_hours).toBe(0);
      expect(result.summary.total_repair_costs).toBe(0);
      expect(result.by_type).toEqual([]);
      expect(result.by_status).toEqual([]);
      expect(result.timeline).toEqual([]);
    });

    it('should count closed incidents', async () => {
      const closedIncident = {
        ...mockIncident,
        status: IncidentStatus.CLOSED,
      };

      repository.find.mockResolvedValue([closedIncident] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.closed).toBe(1);
    });

    it('should calculate percentage correctly for by_type with total > 0', async () => {
      const incidents = [
        { ...mockIncident, incident_type: IncidentType.TECHNICAL_FAILURE },
        { ...mockIncident, id: 'inc-2', incident_type: IncidentType.VANDALISM },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([
          { incident_type: IncidentType.TECHNICAL_FAILURE, count: '1' },
          { incident_type: IncidentType.VANDALISM, count: '1' },
        ])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      // Each type should have 50% percentage
      expect(result.by_type.length).toBeGreaterThan(0);
      if (result.by_type.length > 0) {
        expect(result.by_type[0].percentage).toBeDefined();
      }
    });

    it('should handle by_type with zero total', async () => {
      repository.find.mockResolvedValue([]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([]) // Empty by_type results
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_type).toEqual([]);
    });

    it('should calculate percentage correctly for by_status', async () => {
      const incidents = [
        { ...mockIncident, status: IncidentStatus.OPEN },
        { ...mockIncident, id: 'inc-2', status: IncidentStatus.IN_PROGRESS },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { status: IncidentStatus.OPEN, count: '1' },
          { status: IncidentStatus.IN_PROGRESS, count: '1' },
        ])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_status.length).toBeGreaterThan(0);
    });

    it('should calculate percentage correctly for by_priority', async () => {
      const incidents = [
        { ...mockIncident, priority: IncidentPriority.HIGH },
        { ...mockIncident, id: 'inc-2', priority: IncidentPriority.LOW },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { priority: IncidentPriority.HIGH, count: '1', avg_resolution_time_hours: null },
          { priority: IncidentPriority.LOW, count: '1', avg_resolution_time_hours: '2' },
        ])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_priority.length).toBeGreaterThan(0);
    });

    it('should handle by_machine with null values', async () => {
      const incidents = [mockIncident];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            machine_id: 'machine-uuid',
            machine_number: null,
            machine_name: null,
            location_name: null,
            total_incidents: '1',
            critical_incidents: null,
            avg_resolution_time_hours: null,
            total_repair_costs: null,
            most_common_type: null,
          },
        ])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_machine.length).toBeGreaterThan(0);
      expect(result.by_machine[0].machine_number).toBe('Unknown');
      expect(result.by_machine[0].machine_name).toBe('Unknown');
      expect(result.by_machine[0].location_name).toBe('Unknown');
    });

    it('should merge timeline data from reported, resolved, and closed', async () => {
      const incidents = [
        {
          ...mockIncident,
          reported_at: new Date('2025-01-15'),
          resolved_at: new Date('2025-01-16'),
        },
      ];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ date: '2025-01-15', count: '1' }]) // reported
        .mockResolvedValueOnce([{ date: '2025-01-16', count: '1' }]) // resolved
        .mockResolvedValueOnce([{ date: '2025-01-17', count: '1' }]); // closed

      const result = await service.generateReport(startDate, endDate);

      expect(result.timeline.length).toBe(3);
    });

    it('should handle resolved timeline data for existing date', async () => {
      const incidents = [mockIncident];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ date: '2025-01-15', count: '2' }]) // reported
        .mockResolvedValueOnce([{ date: '2025-01-15', count: '1' }]) // resolved on same date
        .mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.timeline.length).toBe(1);
      expect(result.timeline[0].reported).toBe(2);
      expect(result.timeline[0].resolved).toBe(1);
    });

    it('should handle closed timeline data for new date', async () => {
      const incidents = [mockIncident];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]) // reported
        .mockResolvedValueOnce([]) // resolved
        .mockResolvedValueOnce([{ date: '2025-01-20', count: '1' }]); // closed on new date

      const result = await service.generateReport(startDate, endDate);

      expect(result.timeline.length).toBe(1);
      expect(result.timeline[0].closed).toBe(1);
      expect(result.timeline[0].reported).toBe(0);
    });

    it('should handle critical incident with null machine', async () => {
      const criticalIncidentNoMachine = {
        ...mockIncident,
        priority: IncidentPriority.CRITICAL,
        status: IncidentStatus.OPEN,
        machine: null as any,
      };

      repository.find.mockResolvedValue([criticalIncidentNoMachine] as any);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.critical_incidents.length).toBe(1);
      expect(result.critical_incidents[0].machine_number).toBe('Unknown');
      expect(result.critical_incidents[0].machine_name).toBe('Unknown');
    });

    it('should handle repair_cost with null value', async () => {
      const incidentWithNullCost = {
        ...mockIncident,
        repair_cost: null,
      };

      repository.find.mockResolvedValue([incidentWithNullCost] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_repair_costs).toBe(0);
    });

    it('should handle by_type results with null optional fields', async () => {
      repository.find.mockResolvedValue([mockIncident] as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            incident_type: IncidentType.TECHNICAL_FAILURE,
            count: '1',
            avg_resolution_time_hours: null,
            total_repair_costs: null,
            open: null,
            resolved: null,
          },
        ])
        .mockResolvedValue([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_type.length).toBe(1);
      expect(result.by_type[0].avg_resolution_time_hours).toBe(0);
      expect(result.by_type[0].total_repair_costs).toBe(0);
      expect(result.by_type[0].open).toBe(0);
      expect(result.by_type[0].resolved).toBe(0);
    });

    it('should sort timeline by date', async () => {
      const incidents = [mockIncident];

      repository.find.mockResolvedValue(incidents as Incident[]);

      const mockQueryBuilder = repository.createQueryBuilder();
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { date: '2025-01-20', count: '1' },
          { date: '2025-01-10', count: '1' },
        ]) // reported in non-sorted order
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.timeline[0].date).toBe('2025-01-10');
      expect(result.timeline[1].date).toBe('2025-01-20');
    });
  });
});
