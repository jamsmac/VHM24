/**
 * Shared constants for Telegram module
 */

// Queue names
export const TELEGRAM_QUEUE_NAME = 'telegram-messages';

// Redis key prefixes
export const TELEGRAM_SESSION_PREFIX = 'telegram:session:';
export const TELEGRAM_CART_PREFIX = 'telegram:cart:';
export const TELEGRAM_RATE_LIMIT_PREFIX = 'telegram:ratelimit:';

// Timeouts (in milliseconds)
export const TELEGRAM_API_TIMEOUT = 30000;
export const TELEGRAM_RETRY_DELAY = 1000;
export const TELEGRAM_MAX_RETRIES = 3;

// Session TTL (in seconds)
export const TELEGRAM_SESSION_TTL = 86400; // 24 hours
export const TELEGRAM_CART_TTL = 86400; // 24 hours

// Message limits
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
export const TELEGRAM_MAX_CAPTION_LENGTH = 1024;
export const TELEGRAM_MAX_BUTTONS_PER_ROW = 8;
export const TELEGRAM_MAX_BUTTON_ROWS = 100;

// Rate limiting
export const TELEGRAM_RATE_LIMIT_WINDOW = 1000; // 1 second
export const TELEGRAM_RATE_LIMIT_MAX_REQUESTS = 30;

// Callback data prefixes
export const CALLBACK_PREFIX = {
  TASK: 'task_',
  APPROVE_USER: 'approve_user_',
  REJECT_USER: 'reject_user_',
  MENU: 'menu_',
  SETTINGS: 'settings_',
  QUICK: 'quick_',
  STEP: 'step_',
  CART: 'cart_',
  CATALOG: 'catalog_',
  LANG: 'lang_',
} as const;

// Task execution step prefixes
export const STEP_PREFIX = {
  DONE: 'step_done_',
  SKIP: 'step_skip_',
  BACK: 'step_back_',
} as const;
