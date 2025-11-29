import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportSession } from './entities/import-session.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { ImportWorkflow } from './workflows/import.workflow';
import { FileUpload } from './interfaces/agent.interface';
import { DomainType, ImportSessionStatus } from './interfaces/common.interface';

/**
 * Intelligent Import Service
 *
 * Main service for intelligent import operations
 */
@Injectable()
export class IntelligentImportService {
  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
    @InjectRepository(ImportTemplate)
    private readonly templateRepo: Repository<ImportTemplate>,
    private readonly importWorkflow: ImportWorkflow,
  ) {}

  /**
   * Start import from uploaded file
   */
  async startImport(
    file: Express.Multer.File,
    userId: string,
    onProgress?: (status: ImportSessionStatus, progress: number, message: string) => void,
  ): Promise<{ sessionId: string; status: ImportSessionStatus; message: string }> {
    const fileUpload: FileUpload = {
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    const result = await this.importWorkflow.execute(fileUpload, userId, onProgress);

    return result;
  }

  /**
   * Get import session by ID
   */
  async getSession(sessionId: string): Promise<ImportSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['uploaded_by', 'approved_by', 'template'],
    });

    if (!session) {
      throw new NotFoundException(`Import session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Get all import sessions with filters
   */
  async getSessions(
    status?: ImportSessionStatus,
    domain?: DomainType,
    userId?: string,
  ): Promise<ImportSession[]> {
    const query = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.uploaded_by', 'uploaded_by')
      .leftJoinAndSelect('session.approved_by', 'approved_by')
      .orderBy('session.created_at', 'DESC');

    if (status) {
      query.andWhere('session.status = :status', { status });
    }

    if (domain) {
      query.andWhere('session.domain = :domain', { domain });
    }

    if (userId) {
      query.andWhere('session.uploaded_by_user_id = :userId', { userId });
    }

    return query.getMany();
  }

  /**
   * Approve import session
   */
  async approveSession(sessionId: string, userId: string): Promise<ImportSession> {
    await this.importWorkflow.approve(sessionId, userId);
    return this.getSession(sessionId);
  }

  /**
   * Reject import session
   */
  async rejectSession(sessionId: string, userId: string, reason: string): Promise<ImportSession> {
    await this.importWorkflow.reject(sessionId, userId, reason);
    return this.getSession(sessionId);
  }

  /**
   * Get all templates
   */
  async getTemplates(domain?: DomainType): Promise<ImportTemplate[]> {
    const query = this.templateRepo
      .createQueryBuilder('template')
      .where('template.active = :active', { active: true })
      .orderBy('template.use_count', 'DESC');

    if (domain) {
      query.andWhere('template.domain = :domain', { domain });
    }

    return query.getMany();
  }

  /**
   * Delete import session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.sessionRepo.softRemove(session);
  }
}
