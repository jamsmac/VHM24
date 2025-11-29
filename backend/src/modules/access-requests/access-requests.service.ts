import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AccessRequest, AccessRequestStatus } from './entities/access-request.entity';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { QueryAccessRequestDto } from './dto/query-access-request.dto';
import { UsersService } from '@modules/users/users.service';
import { RbacService } from '@modules/rbac/rbac.service';
import { UserStatus, UserRole } from '@modules/users/entities/user.entity';

/**
 * Access Requests Service
 *
 * Manages access requests from Telegram bot and other sources
 * Implements REQ-AUTH-32 and REQ-AUTH-33
 */
@Injectable()
export class AccessRequestsService {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: Repository<AccessRequest>,
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Create new access request
   *
   * REQ-AUTH-32: Simplified registration - only technical data
   *
   * @param createDto - Access request data
   * @returns Created access request
   * @throws ConflictException if pending request already exists
   */
  async create(createDto: CreateAccessRequestDto): Promise<AccessRequest> {
    // Check if user already exists
    const existingUser = await this.usersService.findByTelegramId(createDto.telegram_id);

    if (existingUser) {
      throw new ConflictException('User with this Telegram ID already exists');
    }

    // Check for pending request
    const pendingRequest = await this.accessRequestRepository.findOne({
      where: {
        telegram_id: createDto.telegram_id,
        status: AccessRequestStatus.NEW,
      },
    });

    if (pendingRequest) {
      throw new ConflictException('Pending access request already exists for this Telegram ID');
    }

    const accessRequest = this.accessRequestRepository.create(createDto);
    return await this.accessRequestRepository.save(accessRequest);
  }

  /**
   * Get all access requests with filters
   *
   * @param queryDto - Query filters
   * @returns Array of access requests
   */
  async findAll(queryDto: QueryAccessRequestDto): Promise<{
    data: AccessRequest[];
    total: number;
  }> {
    const where: FindOptionsWhere<AccessRequest> = {};

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.source) {
      where.source = queryDto.source;
    }

    if (queryDto.telegram_id) {
      where.telegram_id = queryDto.telegram_id;
    }

    const [data, total] = await this.accessRequestRepository.findAndCount({
      where,
      relations: ['processed_by', 'created_user'],
      order: { created_at: 'DESC' },
      take: queryDto.limit || 20,
      skip: queryDto.offset || 0,
    });

    return { data, total };
  }

  /**
   * Get access request by ID
   *
   * @param id - Access request ID
   * @returns Access request
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id },
      relations: ['processed_by', 'created_user'],
    });

    if (!request) {
      throw new NotFoundException(`Access request with ID ${id} not found`);
    }

    return request;
  }

  /**
   * Approve access request and create user account
   *
   * REQ-AUTH-33: Admin assigns roles when approving
   *
   * @param id - Access request ID
   * @param approveDto - Approval data with roles
   * @param adminUserId - Admin user ID who approves
   * @returns Updated access request with created user
   * @throws BadRequestException if already processed or invalid roles
   */
  async approve(
    id: string,
    approveDto: ApproveAccessRequestDto,
    adminUserId: string,
  ): Promise<AccessRequest> {
    const request = await this.findOne(id);

    // Validate status
    if (request.status !== AccessRequestStatus.NEW) {
      throw new BadRequestException(`Cannot approve request with status "${request.status}"`);
    }

    // Validate roles exist
    const roles = await this.rbacService.findRolesByNames(approveDto.role_names);

    if (roles.length !== approveDto.role_names.length) {
      throw new BadRequestException('One or more role names are invalid');
    }

    // Generate temporary password if not provided
    const temporaryPassword = approveDto.temporary_password || this.generateTemporaryPassword();

    // Generate email if not provided
    const email = approveDto.email || `telegram_${request.telegram_id}@vendhub.temp`;

    // Create user account
    const user = await this.usersService.create({
      full_name: this.buildFullName(request),
      email,
      password: temporaryPassword,
      phone: undefined,
      telegram_user_id: request.telegram_id,
      telegram_username: request.telegram_username ?? undefined,
      status: UserStatus.ACTIVE,
      role: UserRole.OPERATOR, // Default role for telegram users
    });

    // Assign roles to user
    const roleIds = roles.map((role) => role.id);
    await this.rbacService.assignRolesToUser(user.id, roleIds);

    // Update request
    request.status = AccessRequestStatus.APPROVED;
    request.processed_by_user_id = adminUserId;
    request.processed_at = new Date();
    request.created_user_id = user.id;
    request.notes = approveDto.notes || null;

    await this.accessRequestRepository.save(request);

    // Return updated request with relations
    return await this.findOne(id);
  }

  /**
   * Reject access request
   *
   * REQ-AUTH-33: Admin can reject with reason
   *
   * @param id - Access request ID
   * @param rejectDto - Rejection data
   * @param adminUserId - Admin user ID who rejects
   * @returns Updated access request
   * @throws BadRequestException if already processed
   */
  async reject(
    id: string,
    rejectDto: RejectAccessRequestDto,
    adminUserId: string,
  ): Promise<AccessRequest> {
    const request = await this.findOne(id);

    // Validate status
    if (request.status !== AccessRequestStatus.NEW) {
      throw new BadRequestException(`Cannot reject request with status "${request.status}"`);
    }

    // Update request
    request.status = AccessRequestStatus.REJECTED;
    request.processed_by_user_id = adminUserId;
    request.processed_at = new Date();
    request.rejection_reason = rejectDto.rejection_reason;
    request.notes = rejectDto.notes || null;

    await this.accessRequestRepository.save(request);

    return await this.findOne(id);
  }

  /**
   * Delete access request (admin only, soft delete)
   *
   * @param id - Access request ID
   */
  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);
    await this.accessRequestRepository.softRemove(request);
  }

  /**
   * Generate secure temporary password
   *
   * @returns Random password
   */
  private generateTemporaryPassword(): string {
    return randomBytes(12).toString('base64').slice(0, 16);
  }

  /**
   * Build full name from Telegram data
   *
   * @param request - Access request
   * @returns Full name
   */
  private buildFullName(request: AccessRequest): string {
    const parts: string[] = [];

    if (request.telegram_first_name) {
      parts.push(request.telegram_first_name);
    }

    if (request.telegram_last_name) {
      parts.push(request.telegram_last_name);
    }

    if (parts.length === 0 && request.telegram_username) {
      return `@${request.telegram_username}`;
    }

    return parts.join(' ') || `Telegram User ${request.telegram_id}`;
  }
}
