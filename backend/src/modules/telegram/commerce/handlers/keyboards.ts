import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { MaterialCategory } from '../../../requests/entities/material.entity';

/**
 * Keyboard utilities для Telegram бота.
 * Портировано из Python vendhub-bot.
 */

const ITEMS_PER_PAGE = 8;

/**
 * Названия категорий на русском.
 */
export const categoryNames: Record<MaterialCategory, string> = {
  [MaterialCategory.INGREDIENTS]: '☕ Ингредиенты',
  [MaterialCategory.CONSUMABLES]: '🥤 Расходники',
  [MaterialCategory.CLEANING]: '🧹 Чистящие',
  [MaterialCategory.SPARE_PARTS]: '🔧 Запчасти',
  [MaterialCategory.PACKAGING]: '📦 Упаковка',
  [MaterialCategory.OTHER]: '📋 Прочее',
};

/**
 * Клавиатура категорий.
 */
export function getCategoryKeyboard(cartCount: number) {
  const buttons: InlineKeyboardButton[][] = [];

  // Категории - по 2 в ряд
  const categories = Object.entries(categoryNames);
  for (let i = 0; i < categories.length; i += 2) {
    const row: InlineKeyboardButton[] = [];
    row.push(Markup.button.callback(categories[i][1], `cat:${categories[i][0]}`));
    if (categories[i + 1]) {
      row.push(Markup.button.callback(categories[i + 1][1], `cat:${categories[i + 1][0]}`));
    }
    buttons.push(row);
  }

  // Поиск
  buttons.push([Markup.button.callback('🔍 Поиск', 'search:start')]);

  // Корзина
  const cartLabel = cartCount > 0 ? `🛒 Корзина (${cartCount})` : '🛒 Корзина';
  buttons.push([Markup.button.callback(cartLabel, 'cart:view')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура материалов с пагинацией.
 */
export function getMaterialsKeyboard(
  materials: { id: string; name: string }[],
  category: string,
  page: number = 0,
) {
  const buttons: InlineKeyboardButton[][] = [];
  const start = page * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = materials.slice(start, end);

  // Материалы
  for (const material of pageItems) {
    buttons.push([Markup.button.callback(material.name, `mat:${material.id}`)]);
  }

  // Пагинация
  const totalPages = Math.ceil(materials.length / ITEMS_PER_PAGE);
  if (totalPages > 1) {
    const paginationRow: InlineKeyboardButton[] = [];
    if (page > 0) {
      paginationRow.push(Markup.button.callback('◀️', `mat_page:${category}:${page - 1}`));
    }
    paginationRow.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
    if (page < totalPages - 1) {
      paginationRow.push(Markup.button.callback('▶️', `mat_page:${category}:${page + 1}`));
    }
    buttons.push(paginationRow);
  }

  // Назад
  buttons.push([Markup.button.callback('⬅️ Назад', 'cat:back')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура выбора количества.
 */
export function getQuantityKeyboard(materialId: string, currentQty: number = 1) {
  const buttons: InlineKeyboardButton[][] = [];

  // Quick presets
  buttons.push([
    Markup.button.callback('1', `qty_set:${materialId}:1`),
    Markup.button.callback('5', `qty_set:${materialId}:5`),
    Markup.button.callback('10', `qty_set:${materialId}:10`),
    Markup.button.callback('20', `qty_set:${materialId}:20`),
  ]);

  // +/- controls
  buttons.push([
    Markup.button.callback('➖', `qty_dec:${materialId}`),
    Markup.button.callback(`📦 ${currentQty}`, 'noop'),
    Markup.button.callback('➕', `qty_inc:${materialId}`),
  ]);

  // Custom input
  buttons.push([Markup.button.callback('✏️ Ввести вручную', `qty_custom:${materialId}`)]);

  // Add to cart
  buttons.push([Markup.button.callback(`✅ Добавить (${currentQty})`, `qty_add:${materialId}`)]);

  // Back
  buttons.push([Markup.button.callback('⬅️ Назад', 'cat:back')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура корзины.
 */
export function getCartKeyboard(cart: { id: string; name: string; quantity: number }[]) {
  const buttons: InlineKeyboardButton[][] = [];

  // Cart items with controls
  for (const item of cart) {
    buttons.push([
      Markup.button.callback('➖', `cart_dec:${item.id}`),
      Markup.button.callback(`${item.name} (${item.quantity})`, 'noop'),
      Markup.button.callback('➕', `cart_inc:${item.id}`),
    ]);
  }

  // Actions
  buttons.push([
    Markup.button.callback('🗑 Очистить', 'cart:clear'),
    Markup.button.callback('📋 Оформить', 'cart:checkout'),
  ]);

  // Continue shopping
  buttons.push([Markup.button.callback('🔙 В каталог', 'cat:back')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура пустой корзины.
 */
export function getCartEmptyKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('📦 Создать заявку', 'cat:back')]]);
}

/**
 * Клавиатура оформления заказа.
 */
export function getCheckoutKeyboard() {
  return Markup.inlineKeyboard([
    // Priority
    [
      Markup.button.callback('🔵 Обычная', 'priority:normal'),
      Markup.button.callback('🟡 Высокая', 'priority:high'),
      Markup.button.callback('🔴 Срочная', 'priority:urgent'),
    ],
    // Comment
    [Markup.button.callback('💬 Добавить комментарий', 'checkout:comment')],
    // Actions
    [
      Markup.button.callback('❌ Отмена', 'checkout:cancel'),
      Markup.button.callback('✅ Подтвердить', 'checkout:confirm'),
    ],
  ]);
}

/**
 * Клавиатура результатов поиска.
 */
export function getSearchResultsKeyboard(
  materials: { id: string; name: string }[],
  query: string,
  page: number = 0,
) {
  const buttons: InlineKeyboardButton[][] = [];
  const start = page * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = materials.slice(start, end);

  if (pageItems.length === 0) {
    buttons.push([Markup.button.callback('📭 Ничего не найдено', 'noop')]);
  } else {
    for (const material of pageItems) {
      buttons.push([Markup.button.callback(material.name, `mat:${material.id}`)]);
    }
  }

  // Pagination
  const totalPages = Math.ceil(materials.length / ITEMS_PER_PAGE);
  if (totalPages > 1) {
    const paginationRow: InlineKeyboardButton[] = [];
    if (page > 0) {
      paginationRow.push(Markup.button.callback('◀️', `search_page:${page - 1}`));
    }
    paginationRow.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
    if (page < totalPages - 1) {
      paginationRow.push(Markup.button.callback('▶️', `search_page:${page + 1}`));
    }
    buttons.push(paginationRow);
  }

  // New search and back
  buttons.push([
    Markup.button.callback('🔍 Новый поиск', 'search:start'),
    Markup.button.callback('⬅️ Назад', 'cat:back'),
  ]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Главное меню бота.
 */
export function getMainMenuKeyboard() {
  return Markup.keyboard([
    ['📦 Создать заявку', '🛒 Корзина'],
    ['📋 Мои заявки', '👤 Профиль'],
  ]).resize();
}
