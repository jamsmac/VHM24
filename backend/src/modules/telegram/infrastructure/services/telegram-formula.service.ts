import { Injectable, Logger } from '@nestjs/common';

/**
 * Variable context for formula evaluation
 */
interface FormulaContext {
  [key: string]: number | string | boolean | null | undefined;
}

/**
 * Formula result with metadata
 */
interface FormulaResult {
  success: boolean;
  value: number | string | boolean;
  error?: string;
}

/**
 * Aggregate function definition
 */
type AggregateFunction = (values: number[]) => number;

/**
 * TelegramFormulaService
 *
 * Simple expression engine for dynamic content in Telegram messages.
 * Supports:
 * - Mathematical expressions (+-*/%)
 * - Comparison operators (< > <= >= == !=)
 * - Logical operators (AND OR NOT)
 * - Aggregate functions (SUM, AVG, MIN, MAX, COUNT)
 * - Conditional expressions (IF condition THEN value1 ELSE value2)
 * - Variable substitution from context
 *
 * Example usage:
 * ```typescript
 * const context = { tasks_completed: 5, tasks_total: 10, bonus_rate: 1.5 };
 * const result = formula.evaluate('tasks_completed * bonus_rate', context);
 * // result.value = 7.5
 *
 * const message = formula.interpolate(
 *   'You completed {{tasks_completed}} of {{tasks_total}} tasks ({{= tasks_completed / tasks_total * 100 }}%)',
 *   context
 * );
 * // message = 'You completed 5 of 10 tasks (50%)'
 * ```
 *
 * @module TelegramInfrastructureModule
 */
@Injectable()
export class TelegramFormulaService {
  private readonly logger = new Logger(TelegramFormulaService.name);

  // Aggregate functions
  private readonly aggregates: Map<string, AggregateFunction> = new Map([
    ['SUM', (values) => values.reduce((a, b) => a + b, 0)],
    ['AVG', (values) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0],
    ['MIN', (values) => values.length > 0 ? Math.min(...values) : 0],
    ['MAX', (values) => values.length > 0 ? Math.max(...values) : 0],
    ['COUNT', (values) => values.length],
  ]);

  // ============================================================================
  // CORE EVALUATION
  // ============================================================================

  /**
   * Evaluate a formula expression with context variables
   *
   * @param expression - Formula expression to evaluate
   * @param context - Variable context
   * @returns Evaluation result
   */
  evaluate(expression: string, context: FormulaContext = {}): FormulaResult {
    try {
      const sanitized = this.sanitizeExpression(expression);
      const substituted = this.substituteVariables(sanitized, context);
      const result = this.evaluateExpression(substituted);

      return {
        success: true,
        value: result,
      };
    } catch (error) {
      this.logger.warn(`Formula evaluation error: ${expression}`, error);
      return {
        success: false,
        value: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Evaluate a conditional expression (IF ... THEN ... ELSE ...)
   */
  evaluateCondition(
    condition: string,
    thenValue: string | number,
    elseValue: string | number,
    context: FormulaContext = {},
  ): FormulaResult {
    try {
      const condResult = this.evaluate(condition, context);

      if (!condResult.success) {
        return condResult;
      }

      const isTruthy = Boolean(condResult.value) && condResult.value !== 0;

      // If values are expressions, evaluate them
      const selectedValue = isTruthy ? thenValue : elseValue;

      if (typeof selectedValue === 'string' && this.containsOperators(selectedValue)) {
        return this.evaluate(selectedValue, context);
      }

      return {
        success: true,
        value: selectedValue,
      };
    } catch (error) {
      return {
        success: false,
        value: elseValue,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // STRING INTERPOLATION
  // ============================================================================

  /**
   * Interpolate a message template with variable substitution and formula evaluation
   *
   * Syntax:
   * - {{variableName}} - Simple variable substitution
   * - {{= expression }} - Expression evaluation
   * - {{? condition ? trueValue : falseValue }} - Conditional
   *
   * @param template - Message template
   * @param context - Variable context
   * @returns Interpolated string
   */
  interpolate(template: string, context: FormulaContext = {}): string {
    let result = template;

    // 1. Handle conditional expressions: {{? condition ? trueValue : falseValue }}
    result = result.replace(
      /\{\{\?\s*(.+?)\s*\?\s*(.+?)\s*:\s*(.+?)\s*\}\}/g,
      (match, condition, trueVal, falseVal) => {
        const condResult = this.evaluate(condition, context);
        const value = condResult.success && condResult.value ? trueVal.trim() : falseVal.trim();
        // Recursively interpolate the selected value
        return this.interpolate(value, context);
      },
    );

    // 2. Handle expression evaluation: {{= expression }}
    result = result.replace(
      /\{\{=\s*(.+?)\s*\}\}/g,
      (match, expression) => {
        const evalResult = this.evaluate(expression, context);
        if (evalResult.success) {
          // Format numbers nicely
          if (typeof evalResult.value === 'number') {
            return this.formatNumber(evalResult.value);
          }
          return String(evalResult.value);
        }
        return match; // Keep original on error
      },
    );

    // 3. Handle simple variable substitution: {{variableName}}
    result = result.replace(
      /\{\{(\w+)\}\}/g,
      (match, varName) => {
        if (varName in context) {
          const value = context[varName];
          if (typeof value === 'number') {
            return this.formatNumber(value);
          }
          return String(value ?? '');
        }
        return match; // Keep original if not found
      },
    );

    return result;
  }

  // ============================================================================
  // AGGREGATE FUNCTIONS
  // ============================================================================

  /**
   * Calculate aggregate over an array of values
   */
  aggregate(funcName: string, values: number[]): FormulaResult {
    const fn = this.aggregates.get(funcName.toUpperCase());

    if (!fn) {
      return {
        success: false,
        value: 0,
        error: `Unknown aggregate function: ${funcName}`,
      };
    }

    try {
      return {
        success: true,
        value: fn(values),
      };
    } catch (error) {
      return {
        success: false,
        value: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register a custom aggregate function
   */
  registerAggregate(name: string, fn: AggregateFunction): void {
    this.aggregates.set(name.toUpperCase(), fn);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Sanitize expression to prevent code injection
   */
  private sanitizeExpression(expression: string): string {
    // Only allow safe characters
    const sanitized = expression
      .replace(/[^\w\s+\-*/%().<>=!&|,\[\]]/g, '')
      .trim();

    // Block dangerous patterns
    const dangerous = [
      /\beval\b/i,
      /\bfunction\b/i,
      /\bnew\b/i,
      /\breturn\b/i,
      /\bimport\b/i,
      /\brequire\b/i,
      /\bprocess\b/i,
      /\bglobal\b/i,
      /\bwindow\b/i,
      /\bdocument\b/i,
    ];

    for (const pattern of dangerous) {
      if (pattern.test(sanitized)) {
        throw new Error('Unsafe expression detected');
      }
    }

    return sanitized;
  }

  /**
   * Substitute variables in expression with their values
   */
  private substituteVariables(expression: string, context: FormulaContext): string {
    let result = expression;

    // Sort keys by length (longest first) to avoid partial replacements
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const value = context[key];
      const regex = new RegExp(`\\b${key}\\b`, 'g');

      if (typeof value === 'number') {
        result = result.replace(regex, String(value));
      } else if (typeof value === 'boolean') {
        result = result.replace(regex, value ? '1' : '0');
      } else if (typeof value === 'string') {
        // For string comparisons, we need special handling
        result = result.replace(regex, `"${value}"`);
      } else {
        result = result.replace(regex, '0');
      }
    }

    return result;
  }

  /**
   * Evaluate mathematical/logical expression
   */
  private evaluateExpression(expression: string): number | boolean {
    // Handle logical operators
    expression = expression.replace(/\bAND\b/gi, '&&');
    expression = expression.replace(/\bOR\b/gi, '||');
    expression = expression.replace(/\bNOT\b/gi, '!');

    // Handle aggregate functions
    expression = this.processAggregates(expression);

    // Validate expression is safe for eval
    if (!this.isSafeExpression(expression)) {
      throw new Error('Invalid expression');
    }

    // Use Function constructor for safe evaluation (no access to scope)
    const fn = new Function(`"use strict"; return (${expression});`);
    const result = fn();

    if (typeof result !== 'number' && typeof result !== 'boolean') {
      throw new Error('Expression must return a number or boolean');
    }

    return result;
  }

  /**
   * Process aggregate functions in expression
   */
  private processAggregates(expression: string): string {
    let result = expression;

    // Match patterns like SUM(1, 2, 3) or AVG([1, 2, 3])
    const aggregatePattern = /(SUM|AVG|MIN|MAX|COUNT)\s*\(\s*\[?\s*([^\)]+?)\s*\]?\s*\)/gi;

    result = result.replace(aggregatePattern, (match, funcName, args) => {
      const values = args
        .split(',')
        .map((v: string) => parseFloat(v.trim()))
        .filter((v: number) => !isNaN(v));

      const aggregateResult = this.aggregate(funcName, values);
      return aggregateResult.success ? String(aggregateResult.value) : '0';
    });

    return result;
  }

  /**
   * Check if expression is safe for evaluation
   */
  private isSafeExpression(expression: string): boolean {
    // Only allow: numbers, operators, parentheses, comparison, boolean literals
    const safePattern = /^[\d\s+\-*/%().!<>=&|true false\[\],]+$/i;
    return safePattern.test(expression);
  }

  /**
   * Check if string contains operators
   */
  private containsOperators(str: string): boolean {
    return /[+\-*/%<>=!&|]/.test(str);
  }

  /**
   * Format number for display
   */
  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    // Round to 2 decimal places if needed
    return Number(value.toFixed(2)).toLocaleString();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a context from task data
   */
  createTaskContext(taskData: {
    completedToday?: number;
    totalAssigned?: number;
    overdueCount?: number;
    avgCompletionTime?: number;
    completionRate?: number;
  }): FormulaContext {
    return {
      completed_today: taskData.completedToday ?? 0,
      total_assigned: taskData.totalAssigned ?? 0,
      overdue_count: taskData.overdueCount ?? 0,
      avg_completion_time: taskData.avgCompletionTime ?? 0,
      completion_rate: taskData.completionRate ?? 0,
      has_overdue: (taskData.overdueCount ?? 0) > 0,
    };
  }

  /**
   * Create a context from machine data
   */
  createMachineContext(machineData: {
    totalMachines?: number;
    onlineCount?: number;
    offlineCount?: number;
    lowStockCount?: number;
    errorCount?: number;
  }): FormulaContext {
    const total = machineData.totalMachines ?? 0;
    const online = machineData.onlineCount ?? 0;

    return {
      total_machines: total,
      online_count: online,
      offline_count: machineData.offlineCount ?? 0,
      low_stock_count: machineData.lowStockCount ?? 0,
      error_count: machineData.errorCount ?? 0,
      online_rate: total > 0 ? (online / total) * 100 : 0,
    };
  }

  /**
   * Create a context from revenue data
   */
  createRevenueContext(revenueData: {
    todayRevenue?: number;
    weekRevenue?: number;
    monthRevenue?: number;
    transactionCount?: number;
    avgTransaction?: number;
  }): FormulaContext {
    return {
      today_revenue: revenueData.todayRevenue ?? 0,
      week_revenue: revenueData.weekRevenue ?? 0,
      month_revenue: revenueData.monthRevenue ?? 0,
      transaction_count: revenueData.transactionCount ?? 0,
      avg_transaction: revenueData.avgTransaction ?? 0,
    };
  }

  /**
   * Build a performance message with dynamic content
   */
  buildPerformanceMessage(
    template: string,
    taskData: Parameters<typeof this.createTaskContext>[0],
    machineData: Parameters<typeof this.createMachineContext>[0],
    revenueData: Parameters<typeof this.createRevenueContext>[0],
  ): string {
    const context = {
      ...this.createTaskContext(taskData),
      ...this.createMachineContext(machineData),
      ...this.createRevenueContext(revenueData),
    };

    return this.interpolate(template, context);
  }
}
