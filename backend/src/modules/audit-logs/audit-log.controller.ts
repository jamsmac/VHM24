import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditLogService } from '@modules/security/services/audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/**
 * Audit Log Controller
 *
 * Provides read-only access to audit logs for admins
 * According to REQ-AUTH-81
 */
@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Get all audit logs with filters
   *
   * REQ-AUTH-81: Admin can view and filter audit logs
   */
  @Get()
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  findAll(@Query() queryDto: QueryAuditLogDto) {
    return this.auditLogService.findAll(queryDto);
  }

  /**
   * Get audit log by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
