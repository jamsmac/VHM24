import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import {
  WebhookSignatureGuard,
  WebhookSignatureOptions,
} from './webhook-signature.guard';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let reflector: jest.Mocked<Reflector>;

  const testSecret = 'test-webhook-secret';

  beforeEach(async () => {
    reflector = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
  });

  function createMockContext(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ): ExecutionContext {
    const request = {
      method: 'POST',
      path: '/webhook/test',
      body,
      headers,
      rawBody: rawBody || JSON.stringify(body),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  function generateSignature(
    payload: string,
    secret: string,
    algorithm: string = 'sha256',
  ): string {
    return crypto.createHmac(algorithm, secret).update(payload, 'utf8').digest('hex');
  }

  describe('canActivate', () => {
    it('should allow request when no signature options configured', async () => {
      const context = createMockContext({ event: 'test' }, {});
      reflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate signature successfully', async () => {
      const body = { event: 'test', data: { id: 1 } };
      const rawBody = JSON.stringify(body);
      const signature = generateSignature(rawBody, testSecret);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        { 'x-webhook-signature': signature },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject when signature is missing', async () => {
      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext({ event: 'test' }, {});
      reflector.get.mockReturnValue(options);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Webhook signature missing');
    });

    it('should reject when signature is invalid', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      const invalidSignature = 'invalid-signature';

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        { 'x-webhook-signature': invalidSignature },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Webhook signature validation failed',
      );
    });

    it('should strip signature prefix when configured', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      const signature = generateSignature(rawBody, testSecret);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-hub-signature-256',
        signaturePrefix: 'sha256=',
        secret: testSecret,
        provider: 'github',
      };

      const context = createMockContext(
        body,
        { 'x-hub-signature-256': `sha256=${signature}` },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should validate timestamp when header is present', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = `${timestamp}.${rawBody}`;
      const signature = generateSignature(payload, testSecret);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        timestampHeader: 'x-webhook-timestamp',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject expired timestamps', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      // Timestamp from 10 minutes ago (600 seconds, default maxAge is 300)
      const timestamp = (Math.floor(Date.now() / 1000) - 600).toString();
      const payload = `${timestamp}.${rawBody}`;
      const signature = generateSignature(payload, testSecret);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        timestampHeader: 'x-webhook-timestamp',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Webhook timestamp expired');
    });

    it('should reject invalid timestamp format', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        timestampHeader: 'x-webhook-timestamp',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        {
          'x-webhook-signature': 'some-signature',
          'x-webhook-timestamp': 'not-a-number',
        },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid webhook timestamp');
    });

    it('should use secret function when provided', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      const dynamicSecret = 'dynamic-secret-123';
      const signature = generateSignature(rawBody, dynamicSecret);

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        secret: async () => dynamicSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        { 'x-webhook-signature': signature },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use SHA-512 algorithm when configured', async () => {
      const body = { event: 'test' };
      const rawBody = JSON.stringify(body);
      const signature = generateSignature(rawBody, testSecret, 'sha512');

      const options: WebhookSignatureOptions = {
        signatureHeader: 'x-webhook-signature',
        algorithm: 'sha512',
        secret: testSecret,
        provider: 'test',
      };

      const context = createMockContext(
        body,
        { 'x-webhook-signature': signature },
        rawBody,
      );
      reflector.get.mockReturnValue(options);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
