/**
 * Agent Bridge Module
 *
 * Enables integration with agent-deck for AI agent session management.
 * Provides real-time monitoring of agent activities in the admin dashboard.
 *
 * Features:
 * - Session registration and tracking
 * - Progress reporting from agents
 * - Real-time status updates via WebSocket
 * - Activity statistics
 *
 * @module AgentBridgeModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentBridgeController } from './agent-bridge.controller';
import { AgentBridgeService } from './services/agent-bridge.service';
import { AgentSession } from './entities/agent-session.entity';
import { AgentProgress } from './entities/agent-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentSession, AgentProgress])],
  controllers: [AgentBridgeController],
  providers: [AgentBridgeService],
  exports: [AgentBridgeService],
})
export class AgentBridgeModule {}
