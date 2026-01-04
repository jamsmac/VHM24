/**
 * Agent Bridge Controller
 *
 * REST API for agent-deck integration.
 * Handles session registration, progress reporting, and status queries.
 *
 * @module AgentBridgeModule
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentBridgeService } from './services/agent-bridge.service';
import { AgentSessionStatus, AgentType } from './entities/agent-session.entity';

// ============================================================================
// DTOs
// ============================================================================

class RegisterSessionDto {
  session_id: string;
  name: string;
  agent_type?: AgentType;
  working_directory?: string;
  profile?: string;
  attached_mcps?: string[];
}

class ReportProgressDto {
  session_id?: string;
  task_id?: string;
  status: string;
  message: string;
  category?: string;
  files_changed?: string[];
  lines_added?: number;
  lines_removed?: number;
  duration_ms?: number;
  proposal_id?: string;
  metadata?: Record<string, unknown>;
}

class UpdateSessionDto {
  status?: AgentSessionStatus;
  current_task?: string;
  attached_mcps?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Controller
// ============================================================================

@ApiTags('Agent Bridge')
@Controller('agent-bridge')
export class AgentBridgeController {
  constructor(private readonly agentBridgeService: AgentBridgeService) {}

  // ============================================================================
  // Session Management
  // ============================================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Register or update an agent session' })
  @ApiResponse({ status: 201, description: 'Session registered' })
  async registerSession(@Body() dto: RegisterSessionDto) {
    return this.agentBridgeService.registerSession(dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AgentSessionStatus })
  async getAllSessions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: AgentSessionStatus,
  ) {
    return this.agentBridgeService.getAllSessions(page || 1, limit || 20, status);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active sessions only' })
  async getActiveSessions() {
    return this.agentBridgeService.getActiveSessions();
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.agentBridgeService.getSession(sessionId);
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({ summary: 'Update session' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.agentBridgeService.updateSession(sessionId, dto);
  }

  @Post('sessions/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark session as completed' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  async completeSession(@Param('sessionId') sessionId: string) {
    return this.agentBridgeService.completeSession(sessionId);
  }

  @Post('sessions/:sessionId/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send heartbeat for session' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  async heartbeat(@Param('sessionId') sessionId: string) {
    await this.agentBridgeService.heartbeat(sessionId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete session' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.agentBridgeService.deleteSession(sessionId);
  }

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  @Post('progress')
  @ApiOperation({ summary: 'Report progress from an agent' })
  @ApiResponse({ status: 201, description: 'Progress recorded' })
  async reportProgress(@Body() dto: ReportProgressDto) {
    return this.agentBridgeService.reportProgress(dto);
  }

  @Get('sessions/:sessionId/progress')
  @ApiOperation({ summary: 'Get progress history for a session' })
  @ApiParam({ name: 'sessionId', description: 'Agent-deck session ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSessionProgress(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
  ) {
    return this.agentBridgeService.getSessionProgress(sessionId, limit || 50);
  }

  @Get('progress/recent')
  @ApiOperation({ summary: 'Get recent progress across all sessions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentProgress(@Query('limit') limit?: number) {
    return this.agentBridgeService.getRecentProgress(limit || 100);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  @Get('statistics')
  @ApiOperation({ summary: 'Get agent activity statistics' })
  async getStatistics() {
    return this.agentBridgeService.getStatistics();
  }
}
