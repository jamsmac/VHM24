/**
 * FSM States для Telegram бота.
 * Портировано из Python vendhub-bot.
 */

/**
 * Состояния FSM каталога материалов.
 */
export enum CatalogState {
  IDLE = 'catalog:idle',
  ENTERING_QUANTITY = 'catalog:entering_quantity',
  SEARCHING = 'catalog:searching',
}

/**
 * Состояния FSM корзины.
 */
export enum CartState {
  IDLE = 'cart:idle',
  ENTERING_COMMENT = 'cart:entering_comment',
  CONFIRMING_CHECKOUT = 'cart:confirming_checkout',
}

/**
 * Данные сессии пользователя.
 */
export interface UserSessionData {
  // FSM state
  state: CatalogState | CartState | string;

  // Catalog state data
  currentCategory?: string;
  selectedMaterialId?: string;
  currentQuantity?: number;

  // Search state data
  searchQuery?: string;
  searchResults?: string[];

  // Cart checkout data
  checkoutItems?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  comment?: string;
}

/**
 * Пустая сессия по умолчанию.
 */
export const defaultSessionData: UserSessionData = {
  state: CatalogState.IDLE,
  currentQuantity: 1,
  priority: 'normal',
};
