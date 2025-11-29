import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Unit Conversion Service
 *
 * CRITICAL: Fixes the recipe cost calculation bug
 * Before: 500,000 UZS/kg * 15g = 7,500,000 UZS (WRONG!)
 * After: 500,000 UZS/kg * 0.015kg = 7,500 UZS (CORRECT!)
 *
 * Supports conversion between:
 * - Weight units: kg, g, mg
 * - Volume units: L, ml
 * - Piece units: pcs, pack, unit
 */
@Injectable()
export class UnitConversionService {
  /**
   * Conversion table for different unit categories
   * Each entry maps: fromUnit -> toUnit -> conversionRate
   */
  private readonly conversionTable: Record<string, Record<string, Record<string, number>>> = {
    // Weight units (масса)
    weight: {
      kg: { kg: 1, g: 1000, mg: 1_000_000, кг: 1, г: 1000, мг: 1_000_000 },
      g: { kg: 0.001, g: 1, mg: 1000, кг: 0.001, г: 1, мг: 1000 },
      mg: { kg: 0.000001, g: 0.001, mg: 1, кг: 0.000001, г: 0.001, мг: 1 },
      кг: { кг: 1, г: 1000, мг: 1_000_000, kg: 1, g: 1000, mg: 1_000_000 },
      г: { кг: 0.001, г: 1, мг: 1000, kg: 0.001, g: 1, mg: 1000 },
      мг: { кг: 0.000001, г: 0.001, мг: 1, kg: 0.000001, g: 0.001, mg: 1 },
    },

    // Volume units (объем)
    volume: {
      L: { L: 1, ml: 1000, л: 1, мл: 1000 },
      ml: { L: 0.001, ml: 1, л: 0.001, мл: 1 },
      л: { л: 1, мл: 1000, L: 1, ml: 1000 },
      мл: { л: 0.001, мл: 1, L: 0.001, ml: 1 },
    },

    // Piece units (штучный товар)
    piece: {
      pcs: { pcs: 1, шт: 1, unit: 1 },
      шт: { шт: 1, pcs: 1, unit: 1 },
      unit: { unit: 1, pcs: 1, шт: 1 },
      pack: { pack: 1, упак: 1 },
      упак: { упак: 1, pack: 1 },
    },
  };

  /**
   * Map units to their categories
   */
  private readonly unitCategories: Record<string, string> = {
    // Weight
    kg: 'weight',
    g: 'weight',
    mg: 'weight',
    кг: 'weight',
    г: 'weight',
    мг: 'weight',

    // Volume
    L: 'volume',
    ml: 'volume',
    л: 'volume',
    мл: 'volume',

    // Piece
    pcs: 'piece',
    шт: 'piece',
    unit: 'piece',
    pack: 'piece',
    упак: 'piece',
  };

  /**
   * Convert quantity from one unit to another
   *
   * @param quantity - Amount to convert
   * @param fromUnit - Source unit (e.g., 'g')
   * @param toUnit - Target unit (e.g., 'kg')
   * @returns Converted quantity
   *
   * @throws BadRequestException if units are incompatible
   *
   * @example
   * convert(15, 'g', 'kg') => 0.015
   * convert(500, 'ml', 'L') => 0.5
   * convert(1, 'pcs', 'pcs') => 1
   */
  convert(quantity: number, fromUnit: string, toUnit: string): number {
    // Same unit - no conversion needed
    if (fromUnit === toUnit) {
      return quantity;
    }

    const fromCategory = this.getUnitCategory(fromUnit);
    const toCategory = this.getUnitCategory(toUnit);

    // Check if units are compatible
    if (!fromCategory) {
      throw new BadRequestException(
        `Неизвестная единица измерения источника: "${fromUnit}". ` +
          `Поддерживаемые: ${Object.keys(this.unitCategories).join(', ')}`,
      );
    }

    if (!toCategory) {
      throw new BadRequestException(
        `Неизвестная единица измерения назначения: "${toUnit}". ` +
          `Поддерживаемые: ${Object.keys(this.unitCategories).join(', ')}`,
      );
    }

    if (fromCategory !== toCategory) {
      throw new BadRequestException(
        `Несовместимые единицы измерения: "${fromUnit}" (${fromCategory}) и "${toUnit}" (${toCategory}). ` +
          `Нельзя конвертировать между разными категориями.`,
      );
    }

    // Get conversion rate
    const categoryTable = this.conversionTable[fromCategory];
    const conversionRate = categoryTable[fromUnit]?.[toUnit];

    if (conversionRate === undefined) {
      throw new BadRequestException(`Невозможно выполнить конверсию: ${fromUnit} → ${toUnit}`);
    }

    return quantity * conversionRate;
  }

  /**
   * Convert quantity to base unit of its category
   * - Weight → kg
   * - Volume → L
   * - Piece → pcs
   *
   * @param quantity - Amount to convert
   * @param unit - Current unit
   * @returns Quantity in base unit
   *
   * @example
   * convertToBaseUnit(15, 'g') => 0.015 (kg)
   * convertToBaseUnit(500, 'ml') => 0.5 (L)
   * convertToBaseUnit(10, 'pcs') => 10 (pcs)
   */
  convertToBaseUnit(quantity: number, unit: string): number {
    const category = this.getUnitCategory(unit);

    if (!category) {
      throw new BadRequestException(`Неизвестная единица измерения: "${unit}"`);
    }

    const baseUnit = this.getBaseUnit(category);
    return this.convert(quantity, unit, baseUnit);
  }

  /**
   * Get the category of a unit (weight, volume, piece)
   *
   * @param unit - Unit to categorize
   * @returns Category name or null if unknown
   */
  getUnitCategory(unit: string): string | null {
    return this.unitCategories[unit] || null;
  }

  /**
   * Get base unit for a category
   *
   * @param category - Category name
   * @returns Base unit for the category
   */
  getBaseUnit(category: string): string {
    const baseUnits: Record<string, string> = {
      weight: 'kg',
      volume: 'L',
      piece: 'pcs',
    };

    return baseUnits[category] || 'pcs';
  }

  /**
   * Check if two units are compatible (can be converted)
   *
   * @param unit1 - First unit
   * @param unit2 - Second unit
   * @returns True if units can be converted between each other
   */
  areUnitsCompatible(unit1: string, unit2: string): boolean {
    if (unit1 === unit2) {
      return true;
    }

    const category1 = this.getUnitCategory(unit1);
    const category2 = this.getUnitCategory(unit2);

    return category1 !== null && category1 === category2;
  }

  /**
   * Calculate cost per base unit for pricing
   *
   * Used for recipe cost calculation:
   * - Purchase price is per unit (e.g., 500,000 UZS/kg)
   * - Recipe uses different unit (e.g., 15g)
   * - Need to calculate cost: 500,000 * (15g → kg) = 500,000 * 0.015 = 7,500 UZS
   *
   * @param price - Price per priceUnit
   * @param priceUnit - Unit in which price is specified
   * @param recipeQuantity - Quantity used in recipe
   * @param recipeUnit - Unit of recipe quantity
   * @returns Total cost in same currency as price
   *
   * @example
   * // Coffee: 500,000 UZS/kg, recipe uses 15g
   * calculateCost(500000, 'kg', 15, 'g')
   * // => 500,000 * convert(15, 'g', 'kg')
   * // => 500,000 * 0.015
   * // => 7,500 UZS
   */
  calculateCost(
    price: number,
    priceUnit: string,
    recipeQuantity: number,
    recipeUnit: string,
  ): number {
    // Convert recipe quantity to price unit
    const quantityInPriceUnit = this.convert(recipeQuantity, recipeUnit, priceUnit);

    // Calculate cost
    return price * quantityInPriceUnit;
  }

  /**
   * Format unit for display
   *
   * @param unit - Unit to format
   * @param locale - Locale for formatting (default: 'ru')
   * @returns Formatted unit string
   */
  formatUnit(unit: string, locale: string = 'ru'): string {
    const unitLabels: Record<string, Record<string, string>> = {
      ru: {
        kg: 'кг',
        g: 'г',
        mg: 'мг',
        L: 'л',
        ml: 'мл',
        pcs: 'шт',
        pack: 'упак',
        unit: 'шт',
      },
      en: {
        kg: 'kg',
        g: 'g',
        mg: 'mg',
        L: 'L',
        ml: 'ml',
        pcs: 'pcs',
        pack: 'pack',
        unit: 'unit',
      },
    };

    return unitLabels[locale]?.[unit] || unit;
  }

  /**
   * Get all supported units
   *
   * @returns Array of all supported unit codes
   */
  getSupportedUnits(): string[] {
    return Object.keys(this.unitCategories);
  }

  /**
   * Get units by category
   *
   * @param category - Category name (weight, volume, piece)
   * @returns Array of units in that category
   */
  getUnitsByCategory(category: string): string[] {
    return Object.entries(this.unitCategories)
      .filter(([_, cat]) => cat === category)
      .map(([unit]) => unit);
  }
}
