/**
 * Shared TypeScript interfaces for Telegram module
 *
 * Contains type definitions for:
 * - Task-related structures used in Telegram bot
 * - Machine-related structures used in Telegram bot
 * - Alert structures
 * - Statistics structures
 * - User structures for pending approval
 * - Keyboard option types
 */

import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { Markup } from 'telegraf';

/**
 * Simplified task structure for Telegram bot display
 * Used in task lists, formatting, and keyboards
 */
export interface TelegramTaskInfo {
  id: string;
  type_code: TaskType;
  status: TaskStatus;
  scheduled_date: Date | string | null;
  machine?: {
    id: string;
    machine_number: string;
    name?: string;
    location?: {
      id: string;
      name: string;
    } | null;
  } | null;
  checklist?: Array<{
    item: string;
    completed: boolean;
  }> | null;
  has_photo_before?: boolean;
  has_photo_after?: boolean;
  metadata?: Record<string, unknown> | null;
}

/**
 * Simplified machine structure for Telegram bot display
 * Used in machine lists and formatting
 */
export interface TelegramMachineInfo {
  id: string | number;
  name: string;
  machine_number?: string;
  status: MachineStatus | 'online' | 'offline' | string;
  location?: string | { name: string } | null;
  latitude?: number;
  longitude?: number;
}

/**
 * Alert structure for Telegram notifications
 */
export interface TelegramAlertInfo {
  id: string | number;
  type: 'offline' | 'low_stock' | 'maintenance' | 'error' | string;
  machine: string;
  time: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Statistics structure for dashboard display
 */
export interface TelegramStatsInfo {
  total_machines: number;
  online: number;
  offline: number;
  today_revenue: number;
  today_sales: number;
  pending_tasks: number;
}

/**
 * Pending user structure for approval workflow
 */
export interface TelegramPendingUserInfo {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  created_at: Date | string;
}

/**
 * Nearby task result with distance calculation
 */
export interface NearbyTaskResult {
  task: TelegramTaskInfo;
  machine: TelegramMachineInfo;
  distance: number;
  distanceFormatted: string;
}

/**
 * Task with machine location for route optimization
 */
export interface TaskWithMachineLocation {
  id: string;
  machine: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Ordered task in optimized route
 */
export interface OrderedTaskResult {
  id: string;
  distance: number;
}

/**
 * Telegram message options with reply markup
 * Compatible with Telegraf's ExtraReplyMessage
 */
export interface TelegramMessageOptions {
  reply_markup?: ReturnType<typeof Markup.inlineKeyboard>['reply_markup'];
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

/**
 * Telegram inline keyboard button row
 */
export type TelegramKeyboardRow = Array<
  ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.url>
>;

/**
 * Express request with authenticated user
 */
export interface AuthenticatedRequest {
  user: {
    userId: string;
    email?: string;
    role?: string;
  };
}

/**
 * Translation function type or string value
 */
export type TranslationValue = string | ((...args: string[]) => string);

/**
 * Translation map structure
 */
export type TranslationMap = Record<string, TranslationValue>;

/**
 * Checklist progress tracking
 */
export interface ChecklistProgress {
  completed: boolean;
  photo_url?: string;
  completed_at?: string;
}

/**
 * Location content for sendLocation
 */
export interface LocationContent {
  latitude: number;
  longitude: number;
}

/**
 * Message content types for queue processor
 * Note: Using unknown for content types as they vary based on message type
 */
export type MessageContent = string | Buffer | LocationContent;
