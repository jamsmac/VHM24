import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UnitConversionService } from './unit-conversion.service';

describe('UnitConversionService', () => {
  let service: UnitConversionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitConversionService],
    }).compile();

    service = module.get<UnitConversionService>(UnitConversionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convert()', () => {
    describe('Weight conversions', () => {
      it('should convert grams to kilograms', () => {
        expect(service.convert(1000, 'g', 'kg')).toBe(1);
        expect(service.convert(500, 'g', 'kg')).toBe(0.5);
        expect(service.convert(15, 'g', 'kg')).toBe(0.015);
      });

      it('should convert kilograms to grams', () => {
        expect(service.convert(1, 'kg', 'g')).toBe(1000);
        expect(service.convert(0.5, 'kg', 'g')).toBe(500);
        expect(service.convert(2.5, 'kg', 'g')).toBe(2500);
      });

      it('should convert milligrams to grams', () => {
        expect(service.convert(1000, 'mg', 'g')).toBe(1);
        expect(service.convert(500, 'mg', 'g')).toBe(0.5);
      });

      it('should handle Russian weight units', () => {
        expect(service.convert(1000, 'г', 'кг')).toBe(1);
        expect(service.convert(1, 'кг', 'г')).toBe(1000);
      });

      it('should convert between Russian and English units', () => {
        expect(service.convert(1000, 'г', 'kg')).toBe(1);
        expect(service.convert(1, 'kg', 'г')).toBe(1000);
      });
    });

    describe('Volume conversions', () => {
      it('should convert milliliters to liters', () => {
        expect(service.convert(1000, 'ml', 'L')).toBe(1);
        expect(service.convert(500, 'ml', 'L')).toBe(0.5);
        expect(service.convert(250, 'ml', 'L')).toBe(0.25);
      });

      it('should convert liters to milliliters', () => {
        expect(service.convert(1, 'L', 'ml')).toBe(1000);
        expect(service.convert(0.5, 'L', 'ml')).toBe(500);
      });

      it('should handle Russian volume units', () => {
        expect(service.convert(1000, 'мл', 'л')).toBe(1);
        expect(service.convert(1, 'л', 'мл')).toBe(1000);
      });
    });

    describe('Piece conversions', () => {
      it('should convert same piece units', () => {
        expect(service.convert(10, 'pcs', 'pcs')).toBe(10);
        expect(service.convert(5, 'шт', 'шт')).toBe(5);
      });

      it('should convert between Russian and English piece units', () => {
        expect(service.convert(10, 'шт', 'pcs')).toBe(10);
        expect(service.convert(5, 'pcs', 'шт')).toBe(5);
      });
    });

    describe('Same unit conversions', () => {
      it('should return same value for identical units', () => {
        expect(service.convert(100, 'kg', 'kg')).toBe(100);
        expect(service.convert(50, 'ml', 'ml')).toBe(50);
        expect(service.convert(10, 'pcs', 'pcs')).toBe(10);
      });
    });

    describe('Error cases', () => {
      it('should throw error for unknown source unit', () => {
        expect(() => service.convert(100, 'unknown', 'kg')).toThrow(BadRequestException);
      });

      it('should throw error for unknown target unit', () => {
        expect(() => service.convert(100, 'kg', 'unknown')).toThrow(BadRequestException);
      });

      it('should throw error for incompatible units', () => {
        expect(() => service.convert(100, 'kg', 'L')).toThrow(BadRequestException);
        expect(() => service.convert(100, 'ml', 'g')).toThrow(BadRequestException);
        expect(() => service.convert(100, 'pcs', 'kg')).toThrow(BadRequestException);
      });
    });
  });

  describe('convertToBaseUnit()', () => {
    it('should convert weight to kilograms', () => {
      expect(service.convertToBaseUnit(1000, 'g')).toBe(1);
      expect(service.convertToBaseUnit(1, 'kg')).toBe(1);
      expect(service.convertToBaseUnit(1000000, 'mg')).toBe(1);
    });

    it('should convert volume to liters', () => {
      expect(service.convertToBaseUnit(1000, 'ml')).toBe(1);
      expect(service.convertToBaseUnit(1, 'L')).toBe(1);
    });

    it('should convert piece to pcs', () => {
      expect(service.convertToBaseUnit(10, 'pcs')).toBe(10);
      expect(service.convertToBaseUnit(10, 'шт')).toBe(10);
    });

    it('should throw error for unknown unit', () => {
      expect(() => service.convertToBaseUnit(100, 'unknown')).toThrow(BadRequestException);
    });
  });

  describe('calculateCost()', () => {
    it('should calculate cost correctly for recipe (CRITICAL BUG FIX)', () => {
      // Coffee: 500,000 UZS/kg, recipe uses 15g
      const cost = service.calculateCost(500000, 'kg', 15, 'g');
      expect(cost).toBe(7500); // NOT 7,500,000!
    });

    it('should calculate cost for same units', () => {
      const cost = service.calculateCost(100, 'kg', 2, 'kg');
      expect(cost).toBe(200);
    });

    it('should calculate cost for volume units', () => {
      // Milk: 10,000 UZS/L, recipe uses 250ml
      const cost = service.calculateCost(10000, 'L', 250, 'ml');
      expect(cost).toBe(2500);
    });

    it('should calculate cost for piece units', () => {
      const cost = service.calculateCost(1000, 'pcs', 5, 'pcs');
      expect(cost).toBe(5000);
    });

    it('should handle decimal quantities', () => {
      const cost = service.calculateCost(100000, 'kg', 0.025, 'kg');
      expect(cost).toBe(2500);
    });

    describe('Real-world recipe examples', () => {
      it('should calculate coffee cost correctly', () => {
        // Coffee: 500,000 UZS/kg, espresso uses 18g
        const cost = service.calculateCost(500000, 'kg', 18, 'g');
        expect(cost).toBeCloseTo(9000, 2); // 500,000 * 0.018 = 9,000 UZS
      });

      it('should calculate milk cost correctly', () => {
        // Milk: 15,000 UZS/L, latte uses 200ml
        const cost = service.calculateCost(15000, 'L', 200, 'ml');
        expect(cost).toBeCloseTo(3000, 2); // 15,000 * 0.2 = 3,000 UZS
      });

      it('should calculate sugar cost correctly', () => {
        // Sugar: 8,000 UZS/kg, one serving uses 10g
        const cost = service.calculateCost(8000, 'kg', 10, 'g');
        expect(cost).toBeCloseTo(80, 2); // 8,000 * 0.01 = 80 UZS
      });

      it('should calculate total recipe cost', () => {
        const coffee = service.calculateCost(500000, 'kg', 18, 'g'); // 9,000
        const milk = service.calculateCost(15000, 'L', 200, 'ml'); // 3,000
        const sugar = service.calculateCost(8000, 'kg', 10, 'g'); // 80

        const totalCost = coffee + milk + sugar;
        expect(totalCost).toBeCloseTo(12080, 2); // Total: 12,080 UZS per cup
      });
    });
  });

  describe('getUnitCategory()', () => {
    it('should return correct category for weight units', () => {
      expect(service.getUnitCategory('kg')).toBe('weight');
      expect(service.getUnitCategory('g')).toBe('weight');
      expect(service.getUnitCategory('mg')).toBe('weight');
      expect(service.getUnitCategory('кг')).toBe('weight');
    });

    it('should return correct category for volume units', () => {
      expect(service.getUnitCategory('L')).toBe('volume');
      expect(service.getUnitCategory('ml')).toBe('volume');
      expect(service.getUnitCategory('л')).toBe('volume');
    });

    it('should return correct category for piece units', () => {
      expect(service.getUnitCategory('pcs')).toBe('piece');
      expect(service.getUnitCategory('шт')).toBe('piece');
      expect(service.getUnitCategory('pack')).toBe('piece');
    });

    it('should return null for unknown units', () => {
      expect(service.getUnitCategory('unknown')).toBeNull();
    });
  });

  describe('areUnitsCompatible()', () => {
    it('should return true for compatible weight units', () => {
      expect(service.areUnitsCompatible('kg', 'g')).toBe(true);
      expect(service.areUnitsCompatible('g', 'mg')).toBe(true);
      expect(service.areUnitsCompatible('кг', 'g')).toBe(true);
    });

    it('should return true for compatible volume units', () => {
      expect(service.areUnitsCompatible('L', 'ml')).toBe(true);
      expect(service.areUnitsCompatible('л', 'ml')).toBe(true);
    });

    it('should return true for same units', () => {
      expect(service.areUnitsCompatible('kg', 'kg')).toBe(true);
      expect(service.areUnitsCompatible('ml', 'ml')).toBe(true);
    });

    it('should return false for incompatible units', () => {
      expect(service.areUnitsCompatible('kg', 'L')).toBe(false);
      expect(service.areUnitsCompatible('g', 'ml')).toBe(false);
      expect(service.areUnitsCompatible('pcs', 'kg')).toBe(false);
    });

    it('should return false for unknown units', () => {
      expect(service.areUnitsCompatible('unknown', 'kg')).toBe(false);
      expect(service.areUnitsCompatible('kg', 'unknown')).toBe(false);
    });
  });

  describe('getBaseUnit()', () => {
    it('should return correct base unit for categories', () => {
      expect(service.getBaseUnit('weight')).toBe('kg');
      expect(service.getBaseUnit('volume')).toBe('L');
      expect(service.getBaseUnit('piece')).toBe('pcs');
    });

    it('should return default for unknown category', () => {
      expect(service.getBaseUnit('unknown')).toBe('pcs');
    });
  });

  describe('getSupportedUnits()', () => {
    it('should return array of all supported units', () => {
      const units = service.getSupportedUnits();

      expect(units).toContain('kg');
      expect(units).toContain('g');
      expect(units).toContain('mg');
      expect(units).toContain('L');
      expect(units).toContain('ml');
      expect(units).toContain('pcs');
      expect(units).toContain('кг'); // Russian units
      expect(units).toContain('г');
      expect(units).toContain('л');
      expect(units).toContain('шт');
    });

    it('should return unique units', () => {
      const units = service.getSupportedUnits();
      const uniqueUnits = [...new Set(units)];

      expect(units.length).toBe(uniqueUnits.length);
    });
  });

  describe('getUnitsByCategory()', () => {
    it('should return weight units', () => {
      const weightUnits = service.getUnitsByCategory('weight');

      expect(weightUnits).toContain('kg');
      expect(weightUnits).toContain('g');
      expect(weightUnits).toContain('mg');
      expect(weightUnits).toContain('кг');
      expect(weightUnits).not.toContain('L');
    });

    it('should return volume units', () => {
      const volumeUnits = service.getUnitsByCategory('volume');

      expect(volumeUnits).toContain('L');
      expect(volumeUnits).toContain('ml');
      expect(volumeUnits).toContain('л');
      expect(volumeUnits).not.toContain('kg');
    });

    it('should return piece units', () => {
      const pieceUnits = service.getUnitsByCategory('piece');

      expect(pieceUnits).toContain('pcs');
      expect(pieceUnits).toContain('шт');
      expect(pieceUnits).not.toContain('kg');
    });

    it('should return empty array for unknown category', () => {
      const units = service.getUnitsByCategory('unknown');
      expect(units).toEqual([]);
    });
  });

  describe('formatUnit()', () => {
    it('should format units for Russian locale', () => {
      expect(service.formatUnit('kg', 'ru')).toBe('кг');
      expect(service.formatUnit('g', 'ru')).toBe('г');
      expect(service.formatUnit('L', 'ru')).toBe('л');
      expect(service.formatUnit('ml', 'ru')).toBe('мл');
      expect(service.formatUnit('pcs', 'ru')).toBe('шт');
    });

    it('should format units for English locale', () => {
      expect(service.formatUnit('kg', 'en')).toBe('kg');
      expect(service.formatUnit('g', 'en')).toBe('g');
      expect(service.formatUnit('L', 'en')).toBe('L');
      expect(service.formatUnit('pcs', 'en')).toBe('pcs');
    });

    it('should return original unit if no translation found', () => {
      expect(service.formatUnit('unknown', 'ru')).toBe('unknown');
    });

    it('should default to Russian locale', () => {
      expect(service.formatUnit('kg')).toBe('кг');
    });
  });
});
