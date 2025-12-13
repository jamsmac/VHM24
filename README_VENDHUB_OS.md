# VendHub OS - Unified Vending Management System

> **Version:** 2.0.0
> **Last Updated:** 2024-12-13
> **Status:** Production Ready

## Overview

VendHub OS is a comprehensive vending machine management system (ERP/CRM/CMMS) designed for manual operations architecture. It consolidates functionality from multiple legacy systems into a single, unified platform.

## Key Characteristics

- **NO direct machine connectivity** - All data flows through operator actions
- **Photo validation mandatory** - Tasks require before/after photos
- **3-level inventory** - Warehouse → Operator → Machine
- **Role-based access** - Manager, Operator, Technician, Warehouse, Viewer

## System Components

```
VendHub OS/
├── backend/          # NestJS API (Source of Truth)
├── frontend/         # Next.js Admin Panel
├── telegram-bot/     # Telegraf Bot (thin client to API)
├── mobile/           # PWA Mobile App
└── docs/             # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- pnpm (recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/jamsmac/VHM24.git
cd VHM24

# Install dependencies
pnpm install

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run database migrations
cd backend && pnpm migration:run

# Start development
pnpm dev
```

### Environment Variables

Key variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vendhub

# Redis
REDIS_URL=redis://localhost:6379

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_ID=your_telegram_id

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# File Storage
S3_BUCKET=vendhub-files
S3_ENDPOINT=https://s3.amazonaws.com
```

## Architecture

### Data Flow

```
Telegram Bot ──┐
               │
Web Frontend ──┼──► API Gateway ──► Backend Services ──► PostgreSQL
               │         │
Mobile App ────┘         └──► Redis (Cache/Queue)
```

### Core Modules

| Module | Description |
|--------|-------------|
| **Auth** | JWT authentication, RBAC, Telegram auth |
| **Users** | User management, roles, permissions |
| **Machines** | Vending machine fleet, status, QR codes |
| **Tasks** | Work orders, checklists, photo validation |
| **Inventory** | 3-level stock management, bags, ingredients |
| **Requests** | Material requests, approvals, suppliers |
| **Sales** | Transaction records, analytics |
| **Payments** | Payment methods (Payme/Click/Uzum), reconciliation |
| **Files** | File upload, processing, storage |
| **Reconciliation** | Payment matching, discrepancy detection |
| **Reports** | Daily/period reports, exports |
| **Telegram** | Bot integration, WebApp auth, notifications |

### User Roles

| Role | Access Level |
|------|--------------|
| **Admin** | Full system access |
| **Manager** | All operations + reports + user management |
| **Operator** | Tasks, refills, collections |
| **Technician** | Repairs, maintenance |
| **Warehouse** | Inventory, bag management, stock transfers |
| **Viewer** | Read-only access to reports |

## API Overview

Base URL: `/api/v1`

### Authentication
- `POST /auth/login` - Login with credentials
- `POST /auth/telegram` - Telegram authentication
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Current user info

### Resources
- `/users` - User management
- `/machines` - Machine CRUD
- `/tasks` - Task management
- `/inventory` - Stock operations
- `/requests` - Material requests
- `/sales` - Sales records
- `/payments` - Payment transactions
- `/files` - File uploads
- `/reconciliation` - Payment matching
- `/reports` - Report generation

See [API_CONTRACT.md](./API_CONTRACT.md) for full documentation.

## Telegram Bot

The bot serves as a mobile interface for field operators:

### Commands
- `/start` - Registration/main menu
- `/tasks` - View assigned tasks
- `/inventory` - Check stock levels
- `/help` - Help and support

### Operator Flows
1. **Task Execution**: View → Accept → Photo Before → Checklist → Photo After → Complete
2. **Cash Collection**: Select machine → Enter amount → Photo → Confirm
3. **Incident Report**: Select machine → Describe issue → Photo → Submit

### Manager Flows
1. **Task Assignment**: Create → Assign → Monitor → Review
2. **Approvals**: View requests → Approve/Reject → Notify
3. **Reports**: Daily summary → Export

## Development

### Project Structure

```
backend/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── tasks/
│   │   ├── inventory/
│   │   ├── requests/      # NEW: Material requests
│   │   ├── reconciliation/ # NEW: Payment matching
│   │   └── telegram/
│   ├── common/            # Shared utilities
│   ├── config/            # Configuration
│   └── database/          # Migrations, seeds
├── test/                  # Tests
└── package.json

frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
└── package.json
```

### Running Tests

```bash
# Backend tests
cd backend && pnpm test

# Frontend tests
cd frontend && pnpm test

# E2E tests
pnpm test:e2e
```

### Code Quality

```bash
# Lint
pnpm lint

# Type check
pnpm type-check

# Format
pnpm format
```

## Deployment

### Docker

```bash
docker-compose up -d
```

### Railway

```bash
railway up
```

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

## Migration from Legacy Systems

This system consolidates:
- **VHM24R_1** - Reports & File Processing
- **VHM24R_2** - Reconciliation & Matching
- **VendBot** - Telegram Bot FSM
- **vendbot_manager** - Admin Panel

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for migration procedures.

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Telegram: @VendHubSupport

## License

Proprietary - VendHub Systems
