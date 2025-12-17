import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Request with rawBody from body-parser middleware
 */
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

/**
 * Webhook signature configuration options
 */
export interface WebhookSignatureOptions {
  /** Header name containing the signature */
  signatureHeader?: string;
  /** Header name containing the timestamp (for replay protection) */
  timestampHeader?: string;
  /** Algorithm to use (default: sha256) */
  algorithm?: 'sha256' | 'sha512' | 'sha1';
  /** Signature prefix to strip (e.g., 'sha256=') */
  signaturePrefix?: string;
  /** Maximum age in seconds for timestamp validation (default: 300 = 5 minutes) */
  maxAge?: number;
  /** Provider name for logging */
  provider?: string;
  /** Secret key or function to retrieve it */
  secret?: string | ((req: Request) => Promise<string>);
}

export const WEBHOOK_SIGNATURE_KEY = 'webhookSignature';

/**
 * Webhook Signature Guard
 *
 * SEC-WEBHOOK-01: HMAC signature validation for incoming webhooks
 *
 * Features:
 * - HMAC signature validation (SHA-256, SHA-512, SHA-1)
 * - Timing-safe comparison to prevent timing attacks
 * - Timestamp validation for replay attack protection
 * - Configurable per-route using decorator
 * - Support for common signature formats (GitHub, Stripe, etc.)
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get options from decorator
    const options = this.reflector.get<WebhookSignatureOptions>(
      WEBHOOK_SIGNATURE_KEY,
      context.getHandler(),
    );

    if (!options) {
      // No signature validation configured for this route
      return true;
    }

    return this.validateSignature(request, options);
  }

  private async validateSignature(
    request: Request,
    options: WebhookSignatureOptions,
  ): Promise<boolean> {
    const {
      signatureHeader = 'x-webhook-signature',
      timestampHeader = 'x-webhook-timestamp',
      algorithm = 'sha256',
      signaturePrefix = '',
      maxAge = 300,
      provider = 'webhook',
    } = options;

    // Get signature from header
    let signature = request.headers[signatureHeader.toLowerCase()] as string;
    if (!signature) {
      this.logger.warn(`[${provider}] Missing signature header: ${signatureHeader}`);
      throw new ForbiddenException('Webhook signature missing');
    }

    // Strip prefix if present
    if (signaturePrefix && signature.startsWith(signaturePrefix)) {
      signature = signature.slice(signaturePrefix.length);
    }

    // Get and validate timestamp if header is configured
    const timestamp = request.headers[timestampHeader.toLowerCase()] as string;
    if (timestamp) {
      const timestampNum = parseInt(timestamp, 10);
      if (isNaN(timestampNum)) {
        this.logger.warn(`[${provider}] Invalid timestamp format`);
        throw new BadRequestException('Invalid webhook timestamp');
      }

      const age = Math.floor(Date.now() / 1000) - timestampNum;
      if (age > maxAge || age < -60) {
        // Allow 60s clock skew
        this.logger.warn(`[${provider}] Timestamp too old or in future: ${age}s`);
        throw new ForbiddenException('Webhook timestamp expired');
      }
    }

    // Get secret
    let secret: string;
    if (typeof options.secret === 'function') {
      secret = await options.secret(request);
    } else if (typeof options.secret === 'string') {
      secret = options.secret;
    } else {
      // Try to get from environment
      secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || '';
    }

    if (!secret) {
      this.logger.error(`[${provider}] No webhook secret configured`);
      throw new ForbiddenException('Webhook secret not configured');
    }

    // Get raw body for signature calculation
    const rawBody = this.getRawBody(request);
    if (!rawBody) {
      this.logger.warn(`[${provider}] No raw body available for signature validation`);
      throw new BadRequestException('Request body required for signature validation');
    }

    // Calculate expected signature
    const payload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Timing-safe comparison
    if (!this.timingSafeCompare(signature, expectedSignature)) {
      this.logger.warn(
        `[${provider}] Signature mismatch for ${request.method} ${request.path}`,
      );
      throw new ForbiddenException('Webhook signature validation failed');
    }

    this.logger.debug(`[${provider}] Signature validated successfully`);
    return true;
  }

  /**
   * Get raw body from request
   * Requires rawBody middleware to be configured
   */
  private getRawBody(request: Request): string | null {
    // Check for raw body stored by body-parser
    const reqWithRawBody = request as RequestWithRawBody;
    if (reqWithRawBody.rawBody) {
      return reqWithRawBody.rawBody;
    }

    // Fallback to stringified body (less secure, may have formatting differences)
    if (request.body) {
      return JSON.stringify(request.body);
    }

    return null;
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeCompare(a: string, b: string): boolean {
    try {
      if (a.length !== b.length) {
        return false;
      }
      return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    } catch {
      return false;
    }
  }
}

/**
 * Decorator to configure webhook signature validation
 *
 * @example
 * // GitHub webhook
 * @WebhookSignature({
 *   signatureHeader: 'x-hub-signature-256',
 *   signaturePrefix: 'sha256=',
 *   provider: 'github'
 * })
 *
 * @example
 * // Stripe webhook
 * @WebhookSignature({
 *   signatureHeader: 'stripe-signature',
 *   timestampHeader: 'stripe-signature',
 *   provider: 'stripe',
 *   secret: () => process.env.STRIPE_WEBHOOK_SECRET
 * })
 */
export function WebhookSignature(options: WebhookSignatureOptions) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(WEBHOOK_SIGNATURE_KEY, options, descriptor.value);
    return descriptor;
  };
}

/**
 * Pre-configured decorator for common webhook providers
 */
export const GitHubWebhook = () =>
  WebhookSignature({
    signatureHeader: 'x-hub-signature-256',
    signaturePrefix: 'sha256=',
    algorithm: 'sha256',
    provider: 'github',
  });

export const StripeWebhook = () =>
  WebhookSignature({
    signatureHeader: 'stripe-signature',
    algorithm: 'sha256',
    provider: 'stripe',
  });

export const TelegramWebhook = () =>
  WebhookSignature({
    signatureHeader: 'x-telegram-bot-api-secret-token',
    algorithm: 'sha256',
    provider: 'telegram',
  });

export const ClickWebhook = () =>
  WebhookSignature({
    signatureHeader: 'x-click-signature',
    algorithm: 'sha256',
    provider: 'click',
  });

export const PaymeWebhook = () =>
  WebhookSignature({
    signatureHeader: 'authorization',
    algorithm: 'sha256',
    provider: 'payme',
  });
