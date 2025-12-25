import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LinkTelegramDto, GenerateVerificationCodeDto } from './link-telegram.dto';

describe('LinkTelegramDto', () => {
  describe('verification_code', () => {
    it('should pass with valid 6-character code', async () => {
      const dto = plainToInstance(LinkTelegramDto, {
        verification_code: 'ABC123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty code', async () => {
      const dto = plainToInstance(LinkTelegramDto, {
        verification_code: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with code too short', async () => {
      const dto = plainToInstance(LinkTelegramDto, {
        verification_code: 'ABC',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with code too long', async () => {
      const dto = plainToInstance(LinkTelegramDto, {
        verification_code: 'ABC1234567',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with non-string code', async () => {
      const dto = plainToInstance(LinkTelegramDto, {
        verification_code: 123456,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with missing code', async () => {
      const dto = plainToInstance(LinkTelegramDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('GenerateVerificationCodeDto', () => {
  describe('user_id', () => {
    it('should pass with valid user_id', async () => {
      const dto = plainToInstance(GenerateVerificationCodeDto, {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty user_id', async () => {
      const dto = plainToInstance(GenerateVerificationCodeDto, {
        user_id: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with missing user_id', async () => {
      const dto = plainToInstance(GenerateVerificationCodeDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with non-string user_id', async () => {
      const dto = plainToInstance(GenerateVerificationCodeDto, {
        user_id: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
