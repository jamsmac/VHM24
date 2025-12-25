import { Test, TestingModule } from '@nestjs/testing';
import { TelegramQrService } from './telegram-qr.service';

describe('TelegramQrService', () => {
  let service: TelegramQrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramQrService],
    }).compile();

    service = module.get<TelegramQrService>(TelegramQrService);
  });

  describe('parseMachineIdentifier', () => {
    it('should return null for empty input', () => {
      expect(service.parseMachineIdentifier('')).toBeNull();
      expect(service.parseMachineIdentifier('   ')).toBeNull();
      expect(service.parseMachineIdentifier(null as any)).toBeNull();
    });

    it('should parse direct machine number (M-001)', () => {
      expect(service.parseMachineIdentifier('M-001')).toBe('M-001');
      expect(service.parseMachineIdentifier('m-047')).toBe('M-047');
      expect(service.parseMachineIdentifier('M-123')).toBe('M-123');
    });

    it('should parse UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(service.parseMachineIdentifier(uuid)).toBe(uuid.toLowerCase());
      expect(service.parseMachineIdentifier(uuid.toUpperCase())).toBe(uuid.toLowerCase());
    });

    it('should parse deep link format', () => {
      expect(service.parseMachineIdentifier('vendhub://machine/M-001')).toBe('M-001');
      expect(service.parseMachineIdentifier('VENDHUB://MACHINE/M-047')).toBe('M-047');
    });

    it('should parse URL format', () => {
      expect(service.parseMachineIdentifier('https://vendhub.app/machine/M-001')).toBe('M-001');
      expect(service.parseMachineIdentifier('http://vendhub.com/machine/M-047')).toBe('M-047');
    });

    it('should parse JSON format with machine field', () => {
      expect(service.parseMachineIdentifier('{"machine": "M-001"}')).toBe('M-001');
    });

    it('should parse JSON format with machineNumber field', () => {
      expect(service.parseMachineIdentifier('{"machineNumber": "M-002"}')).toBe('M-002');
    });

    it('should parse JSON format with id field', () => {
      expect(service.parseMachineIdentifier('{"id": "M-003"}')).toBe('M-003');
    });

    it('should return null for unrecognized format', () => {
      expect(service.parseMachineIdentifier('random text')).toBeNull();
      expect(service.parseMachineIdentifier('12345')).toBeNull();
      expect(service.parseMachineIdentifier('MACHINE-001')).toBeNull();
    });

    it('should handle trimmed whitespace', () => {
      expect(service.parseMachineIdentifier('  M-001  ')).toBe('M-001');
    });
  });

  describe('isValidMachineQR', () => {
    it('should return false for empty input', () => {
      expect(service.isValidMachineQR('')).toBe(false);
      expect(service.isValidMachineQR(null as any)).toBe(false);
    });

    it('should return true for valid machine number', () => {
      expect(service.isValidMachineQR('M-001')).toBe(true);
    });

    it('should return true for valid UUID', () => {
      expect(service.isValidMachineQR('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return true for valid deep link', () => {
      expect(service.isValidMachineQR('vendhub://machine/M-001')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(service.isValidMachineQR('invalid data')).toBe(false);
    });
  });

  describe('generateMachineQRData', () => {
    it('should generate simple format', () => {
      expect(service.generateMachineQRData('M-001', 'simple')).toBe('M-001');
    });

    it('should generate deeplink format', () => {
      expect(service.generateMachineQRData('M-001', 'deeplink')).toBe('vendhub://machine/M-001');
    });

    it('should generate json format', () => {
      const result = service.generateMachineQRData('M-001', 'json');
      const parsed = JSON.parse(result);
      expect(parsed.machine).toBe('M-001');
      expect(parsed.type).toBe('vendhub-machine');
      expect(parsed.version).toBe(1);
    });

    it('should default to simple format', () => {
      expect(service.generateMachineQRData('M-001')).toBe('M-001');
    });

    it('should handle unknown format as simple', () => {
      expect(service.generateMachineQRData('M-001', 'unknown' as any)).toBe('M-001');
    });
  });

  // Note: detectQRCode and getQRQuality methods rely on sharp/jsQR image processing
  // These are tested through error handling paths. The happy paths (QR detected) are
  // marked with v8 ignore as they require real image data for integration testing.
  describe('detectQRCode', () => {
    it('should handle invalid buffer gracefully', async () => {
      const result = await service.detectQRCode(Buffer.from('invalid data'));
      expect(result).toBeNull();
    });
  });

  describe('getQRQuality', () => {
    it('should handle invalid buffer gracefully', async () => {
      const result = await service.getQRQuality(Buffer.from('invalid data'));
      expect(result).toBeNull();
    });
  });
});
