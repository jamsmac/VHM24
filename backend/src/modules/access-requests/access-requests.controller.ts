import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AccessRequestsService } from './access-requests.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { QueryAccessRequestDto } from './dto/query-access-request.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

/**
 * Access Requests Controller
 *
 * Manages access requests from Telegram and other sources
 * According to REQ-AUTH-32 and REQ-AUTH-33
 */
@ApiTags('access-requests')
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  /**
   * Create new access request
   *
   * Public endpoint - called by Telegram bot
   * REQ-AUTH-32: Simplified registration
   */
  @Post()
  @ApiOperation({ summary: 'Create new access request (public)' })
  @ApiResponse({ status: 201, description: 'Access request created' })
  @ApiResponse({ status: 409, description: 'Request already exists' })
  create(@Body() createDto: CreateAccessRequestDto) {
    return this.accessRequestsService.create(createDto);
  }

  /**
   * Get all access requests
   *
   * Admin/SuperAdmin only
   * REQ-AUTH-33: Admin views pending requests
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all access requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of access requests' })
  findAll(@Query() queryDto: QueryAccessRequestDto) {
    return this.accessRequestsService.findAll(queryDto);
  }

  /**
   * Get access request by ID
   *
   * Admin/SuperAdmin only
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get access request by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Access request details' })
  @ApiResponse({ status: 404, description: 'Access request not found' })
  findOne(@Param('id') id: string) {
    return this.accessRequestsService.findOne(id);
  }

  /**
   * Approve access request
   *
   * Admin/SuperAdmin only
   * REQ-AUTH-33: Creates user account and assigns roles
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve access request and create user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Access request approved, user created' })
  @ApiResponse({ status: 400, description: 'Invalid request or already processed' })
  @ApiResponse({ status: 404, description: 'Access request not found' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveAccessRequestDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.accessRequestsService.approve(id, approveDto, adminUserId);
  }

  /**
   * Reject access request
   *
   * Admin/SuperAdmin only
   * REQ-AUTH-33: Admin can reject with reason
   */
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject access request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Access request rejected' })
  @ApiResponse({ status: 400, description: 'Invalid request or already processed' })
  @ApiResponse({ status: 404, description: 'Access request not found' })
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectAccessRequestDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.accessRequestsService.reject(id, rejectDto, adminUserId);
  }

  /**
   * Delete access request
   *
   * SuperAdmin only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete access request (Owner only)' })
  @ApiResponse({ status: 200, description: 'Access request deleted' })
  @ApiResponse({ status: 404, description: 'Access request not found' })
  remove(@Param('id') id: string) {
    return this.accessRequestsService.remove(id);
  }
}
