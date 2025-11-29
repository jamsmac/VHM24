import { Injectable, Logger } from '@nestjs/common';
import jsQR from 'jsqr';
import sharp from 'sharp';

/**
 * QR Code Detection Service for Telegram Bot
 *
 * Detects and decodes QR codes from photos sent by operators.
 * Supports machine identification via QR codes on machines.
 *
 * **Use Cases:**
 * - Operator scans QR code on machine → Instant machine identification
 * - Faster than typing machine number manually
 * - Reduces errors in machine selection
 *
 * **Supported QR Formats:**
 * - Machine number: `M-001`, `M-047`, etc.
 * - Machine UUID: Full UUID if encoded
 * - Deep links: `vendhub://machine/M-001`
 *
 * **Example Flow:**
 * ```
 * 1. Operator sends photo of QR code
 * 2. Service detects QR code and extracts data
 * 3. Bot validates machine exists
 * 4. Bot shows machine info + quick actions
 * ```
 */
@Injectable()
export class TelegramQrService {
  private readonly logger = new Logger(TelegramQrService.name);

  /**
   * Detect and decode QR code from image buffer
   *
   * @param imageBuffer - Raw image data (JPEG, PNG, WebP, etc.)
   * @returns Decoded QR data or null if no QR found
   *
   * @example
   * ```typescript
   * const buffer = await downloadPhoto(photoId);
   * const qrData = await this.qrService.detectQRCode(buffer);
   *
   * if (qrData) {
   *   const machineNumber = this.qrService.parseMachineIdentifier(qrData);
   * }
   * ```
   */
  async detectQRCode(imageBuffer: Buffer): Promise<string | null> {
    try {
      const startTime = Date.now();

      // Convert image to raw RGBA data using sharp
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha() // Ensure RGBA format
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height } = info;

      // Use jsQR to detect QR code
      const code = jsQR(new Uint8ClampedArray(data), width, height, {
        inversionAttempts: 'dontInvert', // Faster, assumes proper contrast
      });

      const detectionTime = Date.now() - startTime;

      if (code) {
        this.logger.log(`QR code detected in ${detectionTime}ms: "${code.data.substring(0, 50)}"`);
        return code.data;
      }

      this.logger.debug(`No QR code found in image (${detectionTime}ms)`);
      return null;
    } catch (error) {
      this.logger.error('QR code detection failed', error);
      return null;
    }
  }

  /**
   * Parse machine identifier from QR code data
   *
   * Supports multiple QR code formats:
   * - Direct machine number: `M-001`
   * - UUID format: `550e8400-e29b-41d4-a716-446655440000`
   * - Deep link: `vendhub://machine/M-001`
   * - URL format: `https://vendhub.app/machine/M-001`
   *
   * @param qrData - Raw QR code data
   * @returns Machine number/UUID or null if not parseable
   *
   * @example
   * ```typescript
   * parseMachineIdentifier('M-047') // → 'M-047'
   * parseMachineIdentifier('vendhub://machine/M-047') // → 'M-047'
   * parseMachineIdentifier('550e8400-e29b-41d4-a716-446655440000') // → '550e8400-...'
   * parseMachineIdentifier('random text') // → null
   * ```
   */
  parseMachineIdentifier(qrData: string): string | null {
    if (!qrData || qrData.trim().length === 0) {
      return null;
    }

    const trimmedData = qrData.trim();

    // Format 1: Direct machine number (M-001, M-047, etc.)
    const machineNumberRegex = /^M-\d+$/i;
    if (machineNumberRegex.test(trimmedData)) {
      return trimmedData.toUpperCase();
    }

    // Format 2: UUID (standard format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmedData)) {
      return trimmedData.toLowerCase();
    }

    // Format 3: Deep link (vendhub://machine/M-001)
    const deepLinkRegex = /^vendhub:\/\/machine\/(.+)$/i;
    const deepLinkMatch = trimmedData.match(deepLinkRegex);
    if (deepLinkMatch) {
      return deepLinkMatch[1];
    }

    // Format 4: URL (https://vendhub.app/machine/M-001)
    const urlRegex = /^https?:\/\/.+\/machine\/(.+)$/i;
    const urlMatch = trimmedData.match(urlRegex);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Format 5: JSON format ({"machine": "M-001"})
    try {
      const jsonData = JSON.parse(trimmedData);
      if (jsonData.machine) {
        return jsonData.machine;
      }
      if (jsonData.machineNumber) {
        return jsonData.machineNumber;
      }
      if (jsonData.id) {
        return jsonData.id;
      }
    } catch {
      // Not JSON, continue
    }

    this.logger.warn(
      `Could not parse machine identifier from QR data: "${qrData.substring(0, 100)}"`,
    );
    return null;
  }

  /**
   * Validate QR code data format
   *
   * Quick check before attempting to parse machine identifier.
   *
   * @param qrData - Raw QR code data
   * @returns True if data looks like valid machine identifier
   */
  isValidMachineQR(qrData: string): boolean {
    if (!qrData || qrData.length === 0) {
      return false;
    }

    // Check if it matches any known format
    const identifier = this.parseMachineIdentifier(qrData);
    return identifier !== null;
  }

  /**
   * Get QR code quality metrics
   *
   * Returns confidence/quality information about detected QR code.
   * Useful for debugging poor QR code scans.
   *
   * @param imageBuffer - Raw image data
   * @returns Quality metrics or null if no QR found
   */
  async getQRQuality(imageBuffer: Buffer): Promise<{
    found: boolean;
    data?: string;
    location?: { x: number; y: number; width: number; height: number };
  } | null> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height } = info;

      const code = jsQR(new Uint8ClampedArray(data), width, height, {
        inversionAttempts: 'attemptBoth', // More thorough for quality check
      });

      if (code) {
        return {
          found: true,
          data: code.data,
          location: {
            x: code.location.topLeftCorner.x,
            y: code.location.topLeftCorner.y,
            width: code.location.topRightCorner.x - code.location.topLeftCorner.x,
            height: code.location.bottomLeftCorner.y - code.location.topLeftCorner.y,
          },
        };
      }

      return { found: false };
    } catch (error) {
      this.logger.error('QR quality check failed', error);
      return null;
    }
  }

  /**
   * Generate QR code data for machine
   *
   * Creates standardized QR code data for printing on machines.
   *
   * @param machineNumber - Machine identifier
   * @param format - Output format
   * @returns QR code data string
   */
  generateMachineQRData(
    machineNumber: string,
    format: 'simple' | 'deeplink' | 'json' = 'simple',
  ): string {
    switch (format) {
      case 'simple':
        return machineNumber;

      case 'deeplink':
        return `vendhub://machine/${machineNumber}`;

      case 'json':
        return JSON.stringify({
          machine: machineNumber,
          type: 'vendhub-machine',
          version: 1,
        });

      default:
        return machineNumber;
    }
  }
}
