import { Incident, IncidentType, IncidentStatus, IncidentPriority } from './incident.entity';

describe('Incident Entity', () => {
  describe('entity properties', () => {
    it('should have default values', () => {
      const incident = new Incident();

      expect(incident.incident_type).toBeUndefined();
      expect(incident.status).toBeUndefined();
      expect(incident.machine_id).toBeUndefined();
    });

    it('should accept all basic properties', () => {
      const incident = new Incident();
      incident.incident_type = IncidentType.TECHNICAL_FAILURE;
      incident.status = IncidentStatus.OPEN;
      incident.priority = IncidentPriority.HIGH;
      incident.machine_id = 'machine-uuid';
      incident.title = 'Machine not dispensing change';
      incident.description = 'Bill validator not returning change';

      expect(incident.incident_type).toBe(IncidentType.TECHNICAL_FAILURE);
      expect(incident.status).toBe(IncidentStatus.OPEN);
      expect(incident.priority).toBe(IncidentPriority.HIGH);
      expect(incident.machine_id).toBe('machine-uuid');
      expect(incident.title).toBe('Machine not dispensing change');
      expect(incident.description).toBe('Bill validator not returning change');
    });

    it('should accept reporting user information', () => {
      const incident = new Incident();
      incident.reported_by_user_id = 'user-uuid';
      incident.reported_at = new Date('2025-11-14T10:00:00Z');

      expect(incident.reported_by_user_id).toBe('user-uuid');
      expect(incident.reported_at).toEqual(new Date('2025-11-14T10:00:00Z'));
    });

    it('should accept assigned user information', () => {
      const incident = new Incident();
      incident.assigned_to_user_id = 'technician-uuid';

      expect(incident.assigned_to_user_id).toBe('technician-uuid');
    });

    it('should accept workflow timestamps', () => {
      const incident = new Incident();
      incident.started_at = new Date('2025-11-14T11:00:00Z');
      incident.resolved_at = new Date('2025-11-14T14:00:00Z');
      incident.closed_at = new Date('2025-11-14T15:00:00Z');

      expect(incident.started_at).toEqual(new Date('2025-11-14T11:00:00Z'));
      expect(incident.resolved_at).toEqual(new Date('2025-11-14T14:00:00Z'));
      expect(incident.closed_at).toEqual(new Date('2025-11-14T15:00:00Z'));
    });

    it('should accept resolution information', () => {
      const incident = new Incident();
      incident.resolution_notes = 'Replaced bill validator module';
      incident.repair_task_id = 'task-uuid';
      incident.repair_cost = 2500.5;

      expect(incident.resolution_notes).toBe('Replaced bill validator module');
      expect(incident.repair_task_id).toBe('task-uuid');
      expect(incident.repair_cost).toBe(2500.5);
    });

    it('should accept metadata', () => {
      const incident = new Incident();
      incident.metadata = {
        error_code: 'E42',
        component: 'bill_validator',
      };

      expect(incident.metadata).toEqual({
        error_code: 'E42',
        component: 'bill_validator',
      });
    });

    it('should handle nullable fields', () => {
      const incident = new Incident();
      incident.incident_type = IncidentType.OTHER;
      incident.machine_id = 'machine-uuid';
      incident.title = 'Test incident';
      incident.description = 'Test description';
      incident.reported_by_user_id = null;
      incident.assigned_to_user_id = null;
      incident.started_at = null;
      incident.resolved_at = null;
      incident.closed_at = null;
      incident.resolution_notes = null;
      incident.repair_task_id = null;
      incident.metadata = null;
      incident.repair_cost = null;

      expect(incident.reported_by_user_id).toBeNull();
      expect(incident.assigned_to_user_id).toBeNull();
      expect(incident.started_at).toBeNull();
      expect(incident.resolved_at).toBeNull();
      expect(incident.closed_at).toBeNull();
      expect(incident.resolution_notes).toBeNull();
      expect(incident.repair_task_id).toBeNull();
      expect(incident.metadata).toBeNull();
      expect(incident.repair_cost).toBeNull();
    });
  });

  describe('IncidentType enum', () => {
    it('should have all expected types', () => {
      expect(IncidentType.TECHNICAL_FAILURE).toBe('technical_failure');
      expect(IncidentType.OUT_OF_STOCK).toBe('out_of_stock');
      expect(IncidentType.CASH_FULL).toBe('cash_full');
      expect(IncidentType.CASH_DISCREPANCY).toBe('cash_discrepancy');
      expect(IncidentType.VANDALISM).toBe('vandalism');
      expect(IncidentType.POWER_OUTAGE).toBe('power_outage');
      expect(IncidentType.OTHER).toBe('other');
    });
  });

  describe('IncidentStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(IncidentStatus.OPEN).toBe('open');
      expect(IncidentStatus.IN_PROGRESS).toBe('in_progress');
      expect(IncidentStatus.RESOLVED).toBe('resolved');
      expect(IncidentStatus.CLOSED).toBe('closed');
    });
  });

  describe('IncidentPriority enum', () => {
    it('should have all expected priorities', () => {
      expect(IncidentPriority.LOW).toBe('low');
      expect(IncidentPriority.MEDIUM).toBe('medium');
      expect(IncidentPriority.HIGH).toBe('high');
      expect(IncidentPriority.CRITICAL).toBe('critical');
    });
  });
});
