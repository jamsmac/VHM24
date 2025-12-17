/**
 * Tasks Module Services
 *
 * Refactored from monolithic TasksService into focused services:
 * - TaskCompletionService: Task completion logic with photo validation, inventory updates
 * - TaskRejectionService: Task rejection with compensating transactions
 * - TaskEscalationService: Overdue task detection, escalation, statistics
 */

export * from './task-completion.service';
export * from './task-rejection.service';
export * from './task-escalation.service';
