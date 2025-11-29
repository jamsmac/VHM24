import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataEncryption, EncryptionStatus } from '../entities/data-encryption.entity';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(
    @InjectRepository(DataEncryption)
    private encryptionRepository: Repository<DataEncryption>,
  ) {
    // REQ-AUTH-40: Encryption key must be set in environment
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable must be set');
    }
    if (keyString.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    this.key = crypto.scryptSync(keyString, 'vendhub-salt-v1', 32);
  }

  async encryptField(
    entityType: string,
    entityId: string,
    fieldName: string,
    value: string,
    encryptedById?: string,
    metadata?: Record<string, any>,
  ): Promise<DataEncryption> {
    const encrypted = this.encrypt(value);

    const encryptionRecord = this.encryptionRepository.create({
      entity_type: entityType,
      entity_id: entityId,
      field_name: fieldName,
      encrypted_value: encrypted,
      encryption_algorithm: this.algorithm,
      key_version: 'v1',
      status: EncryptionStatus.ENCRYPTED,
      encrypted_at: new Date(),
      encrypted_by_id: encryptedById,
      metadata: metadata || {},
    });

    return this.encryptionRepository.save(encryptionRecord);
  }

  async decryptField(
    entityType: string,
    entityId: string,
    fieldName: string,
    accessedById?: string,
  ): Promise<string> {
    const encryptionRecord = await this.encryptionRepository.findOne({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
      },
    });

    if (!encryptionRecord) {
      throw new Error('Encrypted field not found');
    }

    // Update access tracking
    encryptionRecord.last_accessed_at = new Date();
    encryptionRecord.last_accessed_by_id = accessedById || null;
    encryptionRecord.access_count++;
    await this.encryptionRepository.save(encryptionRecord);

    return this.decrypt(encryptionRecord.encrypted_value);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + AuthTag + EncryptedData
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async getEncryptedFields(entityType: string, entityId: string): Promise<DataEncryption[]> {
    return this.encryptionRepository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
    });
  }

  async cleanExpiredData(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Only delete if retention period is specified in metadata
    const result = await this.encryptionRepository
      .createQueryBuilder()
      .delete()
      .where('encrypted_at < :cutoffDate', { cutoffDate })
      .andWhere("metadata->>'retention_period' IS NOT NULL")
      .andWhere("CAST(metadata->>'retention_period' AS INTEGER) < :daysToKeep", { daysToKeep })
      .execute();

    return result.affected || 0;
  }
}
