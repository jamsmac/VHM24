import { Test, TestingModule } from '@nestjs/testing';
import { TelegramFormulaService } from './telegram-formula.service';

describe('TelegramFormulaService', () => {
  let service: TelegramFormulaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramFormulaService],
    }).compile();

    service = module.get<TelegramFormulaService>(TelegramFormulaService);
  });

  describe('evaluate', () => {
    describe('basic arithmetic', () => {
      it('should evaluate addition', () => {
        const result = service.evaluate('2 + 3');
        expect(result.success).toBe(true);
        expect(result.value).toBe(5);
      });

      it('should evaluate subtraction', () => {
        const result = service.evaluate('10 - 4');
        expect(result.success).toBe(true);
        expect(result.value).toBe(6);
      });

      it('should evaluate multiplication', () => {
        const result = service.evaluate('6 * 7');
        expect(result.success).toBe(true);
        expect(result.value).toBe(42);
      });

      it('should evaluate division', () => {
        const result = service.evaluate('20 / 4');
        expect(result.success).toBe(true);
        expect(result.value).toBe(5);
      });

      it('should evaluate modulo', () => {
        const result = service.evaluate('17 % 5');
        expect(result.success).toBe(true);
        expect(result.value).toBe(2);
      });

      it('should respect operator precedence', () => {
        const result = service.evaluate('2 + 3 * 4');
        expect(result.success).toBe(true);
        expect(result.value).toBe(14);
      });

      it('should handle parentheses', () => {
        const result = service.evaluate('(2 + 3) * 4');
        expect(result.success).toBe(true);
        expect(result.value).toBe(20);
      });
    });

    describe('variable substitution', () => {
      it('should substitute simple variables', () => {
        const result = service.evaluate('x + y', { x: 5, y: 3 });
        expect(result.success).toBe(true);
        expect(result.value).toBe(8);
      });

      it('should handle underscore in variable names', () => {
        const result = service.evaluate('tasks_completed * 10', { tasks_completed: 5 });
        expect(result.success).toBe(true);
        expect(result.value).toBe(50);
      });

      it('should handle multiple variables', () => {
        const result = service.evaluate('a + b + c', { a: 1, b: 2, c: 3 });
        expect(result.success).toBe(true);
        expect(result.value).toBe(6);
      });

      it('should treat undefined variables as 0', () => {
        const result = service.evaluate('x + 5', {});
        expect(result.success).toBe(true);
        expect(result.value).toBe(5);
      });

      it('should handle boolean variables', () => {
        const result = service.evaluate('is_active + 1', { is_active: true });
        expect(result.success).toBe(true);
        expect(result.value).toBe(2);
      });
    });

    describe('comparison operators', () => {
      it('should evaluate less than', () => {
        const result = service.evaluate('3 < 5');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate greater than', () => {
        const result = service.evaluate('10 > 5');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate equals', () => {
        const result = service.evaluate('5 == 5');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate not equals', () => {
        const result = service.evaluate('5 != 3');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate less than or equal', () => {
        const result = service.evaluate('5 <= 5');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate greater than or equal', () => {
        const result = service.evaluate('5 >= 4');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });
    });

    describe('logical operators', () => {
      it('should evaluate AND', () => {
        const result = service.evaluate('1 AND 1');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate OR', () => {
        const result = service.evaluate('0 OR 1');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should evaluate NOT', () => {
        const result = service.evaluate('NOT 0');
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should combine logical operators', () => {
        const result = service.evaluate('(x > 5) AND (y < 10)', { x: 6, y: 8 });
        expect(result.success).toBe(true);
        expect(result.value).toBe(true);
      });
    });

    describe('security', () => {
      it('should block eval', () => {
        const result = service.evaluate('eval("1+1")');
        expect(result.success).toBe(false);
      });

      it('should block function keyword', () => {
        const result = service.evaluate('function() { return 1; }');
        expect(result.success).toBe(false);
      });

      it('should block process access', () => {
        const result = service.evaluate('process.exit()');
        expect(result.success).toBe(false);
      });

      it('should block require', () => {
        const result = service.evaluate('require("fs")');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('evaluateCondition', () => {
    it('should return then value when condition is true', () => {
      const result = service.evaluateCondition('x > 5', 'yes', 'no', { x: 10 });
      expect(result.success).toBe(true);
      expect(result.value).toBe('yes');
    });

    it('should return else value when condition is false', () => {
      const result = service.evaluateCondition('x > 5', 'yes', 'no', { x: 3 });
      expect(result.success).toBe(true);
      expect(result.value).toBe('no');
    });

    it('should evaluate expressions in values', () => {
      const result = service.evaluateCondition('x > 5', 'x * 2', 'x + 1', { x: 10 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });
  });

  describe('aggregate', () => {
    it('should calculate SUM', () => {
      const result = service.aggregate('SUM', [1, 2, 3, 4, 5]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(15);
    });

    it('should calculate AVG', () => {
      const result = service.aggregate('AVG', [10, 20, 30]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should calculate MIN', () => {
      const result = service.aggregate('MIN', [5, 2, 8, 1, 9]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should calculate MAX', () => {
      const result = service.aggregate('MAX', [5, 2, 8, 1, 9]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(9);
    });

    it('should calculate COUNT', () => {
      const result = service.aggregate('COUNT', [1, 2, 3, 4, 5]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should handle empty array', () => {
      const result = service.aggregate('AVG', []);
      expect(result.success).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should handle unknown function', () => {
      const result = service.aggregate('UNKNOWN', [1, 2, 3]);
      expect(result.success).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = service.aggregate('sum', [1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(6);
    });
  });

  describe('interpolate', () => {
    describe('variable substitution', () => {
      it('should substitute simple variables', () => {
        const result = service.interpolate('Hello {{name}}!', { name: 'World' });
        expect(result).toBe('Hello World!');
      });

      it('should handle multiple variables', () => {
        const result = service.interpolate(
          '{{user}} completed {{count}} tasks',
          { user: 'John', count: 5 },
        );
        expect(result).toBe('John completed 5 tasks');
      });

      it('should keep unknown variables unchanged', () => {
        const result = service.interpolate('Hello {{name}}!', {});
        expect(result).toBe('Hello {{name}}!');
      });

      it('should format numbers with locale', () => {
        const result = service.interpolate('Total: {{amount}}', { amount: 1234567 });
        expect(result).toContain('1');
      });
    });

    describe('expression evaluation', () => {
      it('should evaluate expressions with {{= }}', () => {
        const result = service.interpolate('Result: {{= 2 + 3 }}', {});
        expect(result).toBe('Result: 5');
      });

      it('should evaluate expressions with variables', () => {
        const result = service.interpolate(
          'Completion: {{= completed / total * 100 }}%',
          { completed: 5, total: 10 },
        );
        expect(result).toBe('Completion: 50%');
      });

      it('should handle complex expressions', () => {
        const result = service.interpolate(
          'Bonus: {{= tasks * rate }}',
          { tasks: 10, rate: 1.5 },
        );
        expect(result).toBe('Bonus: 15');
      });
    });

    describe('conditional expressions', () => {
      it('should handle true condition', () => {
        const result = service.interpolate(
          'Status: {{? count > 0 ? Active : Inactive }}',
          { count: 5 },
        );
        expect(result).toBe('Status: Active');
      });

      it('should handle false condition', () => {
        const result = service.interpolate(
          'Status: {{? count > 0 ? Active : Inactive }}',
          { count: 0 },
        );
        expect(result).toBe('Status: Inactive');
      });

      it('should handle nested interpolation in conditions', () => {
        const result = service.interpolate(
          '{{? overdue > 0 ? ⚠️ {{overdue}} overdue : ✅ All good }}',
          { overdue: 3 },
        );
        expect(result).toBe('⚠️ 3 overdue');
      });
    });

    describe('combined usage', () => {
      it('should handle all syntax types together', () => {
        const template = `
          User: {{name}}
          Tasks: {{= completed }} / {{total}}
          Status: {{? completed >= total ? ✅ Done : ⏳ In progress }}
        `;
        const result = service.interpolate(template, {
          name: 'John',
          completed: 5,
          total: 5,
        });

        expect(result).toContain('User: John');
        expect(result).toContain('Tasks: 5 / 5');
        expect(result).toContain('✅ Done');
      });
    });
  });

  describe('registerAggregate', () => {
    it('should allow registering custom aggregates', () => {
      service.registerAggregate('MEDIAN', (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      });

      const result = service.aggregate('MEDIAN', [1, 3, 5, 7, 9]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
    });
  });

  describe('context builders', () => {
    it('should create task context', () => {
      const context = service.createTaskContext({
        completedToday: 10,
        totalAssigned: 15,
        overdueCount: 2,
      });

      expect(context.completed_today).toBe(10);
      expect(context.total_assigned).toBe(15);
      expect(context.overdue_count).toBe(2);
      expect(context.has_overdue).toBe(true);
    });

    it('should create machine context', () => {
      const context = service.createMachineContext({
        totalMachines: 100,
        onlineCount: 90,
        offlineCount: 10,
      });

      expect(context.total_machines).toBe(100);
      expect(context.online_count).toBe(90);
      expect(context.online_rate).toBe(90);
    });

    it('should create revenue context', () => {
      const context = service.createRevenueContext({
        todayRevenue: 5000,
        weekRevenue: 25000,
        transactionCount: 100,
      });

      expect(context.today_revenue).toBe(5000);
      expect(context.week_revenue).toBe(25000);
      expect(context.transaction_count).toBe(100);
    });
  });

  describe('buildPerformanceMessage', () => {
    it('should build complete performance message', () => {
      const template = `
        Tasks: {{completed_today}}/{{total_assigned}}
        Revenue: {{today_revenue}}
        Machines: {{online_count}}/{{total_machines}}
      `;

      const result = service.buildPerformanceMessage(
        template,
        { completedToday: 5, totalAssigned: 10 },
        { totalMachines: 50, onlineCount: 45 },
        { todayRevenue: 10000 },
      );

      expect(result).toContain('5');
      expect(result).toContain('10');
      expect(result).toContain('45');
      expect(result).toContain('50');
    });
  });
});
