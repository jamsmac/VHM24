# Agent-Deck Integration for VendHub Manager

This directory contains integration components for [agent-deck](https://github.com/asheshgoplani/agent-deck), enabling AI agents to work with VHM24 codebase through MCP (Model Context Protocol).

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Terminal                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    agent-deck TUI                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │   │
│  │  │ Session 1   │ │ Session 2   │ │ Session 3   │         │   │
│  │  │ Claude Code │ │ Gemini CLI  │ │ Cursor      │         │   │
│  │  │ [Running]   │ │ [Waiting]   │ │ [Idle]      │         │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                     VendHub MCP Server                           │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VHM24 Backend                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Agent Bridge Module                        │   │
│  │  - Session tracking                                       │   │
│  │  - Progress logging                                       │   │
│  │  - WebSocket events                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           AI Assistant Module (proposals)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VHM24 Frontend                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Agent Monitoring Dashboard                     │   │
│  │  /dashboard/agents                                        │   │
│  │  - Real-time session status                               │   │
│  │  - Activity feed                                          │   │
│  │  - Statistics                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. MCP Server (`mcp-server/`)

Node.js MCP server that provides AI agents access to VHM24 functionality:

**Tools Available:**
- `vhm_list_modules` - List all NestJS modules
- `vhm_read_file` - Read project files
- `vhm_search_code` - Search patterns in code
- `vhm_analyze_module` - Analyze module structure
- `vhm_db_schema` - Get database schema
- `vhm_run_tests` - Run Jest tests
- `vhm_lint` - Run ESLint
- `vhm_type_check` - TypeScript checking
- `vhm_api_test` - Test API endpoints
- `vhm_generate_entity` - Create TypeORM entity
- `vhm_generate_dto` - Create DTOs
- `vhm_generate_migration` - Create migration
- `vhm_find_issues` - Find code issues
- `vhm_apply_fix` - Apply code fixes
- `vhm_report_progress` - Report to dashboard
- `vhm_create_proposal` - Create code proposal

**Setup:**
```bash
cd agent-deck/mcp-server
npm install
npm run build
```

### 2. Skills (`skills/`)

Claude Code skill definitions for VHM24 development:

- `vendhub-developer.md` - Main development skill with project knowledge

### 3. Configuration (`config/`)

- `agent-deck.toml` - Agent-deck configuration with VHM24 MCP definition

## Quick Start

### 1. Install agent-deck

```bash
curl -fsSL https://raw.githubusercontent.com/asheshgoplani/agent-deck/main/install.sh | bash
```

### 2. Build MCP Server

```bash
cd /path/to/VHM24/agent-deck/mcp-server
npm install
npm run build
```

### 3. Configure agent-deck

Copy configuration to agent-deck config:

```bash
# Option 1: Copy entire config
cp config/agent-deck.toml ~/.agent-deck/config.toml

# Option 2: Merge VHM24 MCP into existing config
cat config/agent-deck.toml >> ~/.agent-deck/config.toml
```

### 4. Create VHM24 Session

```bash
# Navigate to VHM24 project
cd /path/to/VHM24

# Create a new session with Claude Code
agent-deck add . -c claude -n "VHM24 Development"

# Attach VendHub MCP
agent-deck mcp attach <session-id> vendhub
```

### 5. Start Working

```bash
# Attach to session
agent-deck session attach <session-id>

# Or use the TUI
agent-deck
```

## Using the Integration

### From Agent-Deck Sessions

Agents with `vendhub` MCP attached can:

1. **Analyze Code:**
   ```
   Use vhm_analyze_module to understand the tasks module
   ```

2. **Run Tests:**
   ```
   Use vhm_run_tests to run tests for the machines module
   ```

3. **Generate Code:**
   ```
   Use vhm_generate_entity to create a new entity
   ```

4. **Create Proposals:**
   ```
   Use vhm_create_proposal to submit changes for review
   ```

### From Admin Dashboard

Visit `/dashboard/agents` to:

- See all active agent sessions
- Monitor real-time progress
- View activity feed
- Review agent-created proposals

## Environment Variables

For MCP Server:

| Variable | Description | Default |
|----------|-------------|---------|
| `VHM_PROJECT_ROOT` | Path to VHM24 project | Current directory |
| `VHM_API_URL` | Backend API URL | `http://localhost:3000/api` |
| `VHM_API_TOKEN` | JWT token for API access | (none) |
| `AGENT_DECK_SESSION` | Current session ID | (auto-detected) |

## Development

### Running MCP Server Locally

```bash
cd mcp-server
npm run dev
```

### Testing MCP Tools

```bash
# Via agent-deck
agent-deck mcp test vendhub vhm_project_status

# Direct execution
echo '{"method":"tools/call","params":{"name":"vhm_project_status"}}' | node dist/index.js
```

## API Endpoints

The Agent Bridge module provides these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent-bridge/sessions` | Register session |
| GET | `/agent-bridge/sessions` | List all sessions |
| GET | `/agent-bridge/sessions/active` | Get active sessions |
| GET | `/agent-bridge/sessions/:id` | Get session details |
| POST | `/agent-bridge/sessions/:id/heartbeat` | Send heartbeat |
| POST | `/agent-bridge/progress` | Report progress |
| GET | `/agent-bridge/statistics` | Get statistics |

## Best Practices

1. **Use Profiles**: Define session profiles in config for different work types
2. **Report Progress**: Call `vhm_report_progress` to keep dashboard updated
3. **Create Proposals**: Use `vhm_create_proposal` for significant changes
4. **Fork for Subtasks**: Use `agent-deck session fork` for parallel exploration
5. **Check Before Commit**: Always run `vhm_type_check` and `vhm_lint`

## Troubleshooting

### MCP Not Connecting

1. Ensure MCP server is built: `npm run build`
2. Check path in config matches your installation
3. Restart agent-deck session

### No Progress in Dashboard

1. Ensure backend is running with Agent Bridge module
2. Check `VHM_API_URL` is correct
3. Verify agent is calling `vhm_report_progress`

### Session Not Appearing

1. Session needs to call `registerSession` at start
2. Check heartbeat is being sent
3. Verify WebSocket connection

## License

MIT - Same as VendHub Manager
