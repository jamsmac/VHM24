# VendHub Manager 🎰

[![CI/CD Pipeline](https://github.com/jamsmac/VendHub/actions/workflows/ci.yml/badge.svg)](https://github.com/jamsmac/VendHub/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vendhub-manager&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vendhub-manager)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vendhub-manager&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vendhub-manager)

**Complete Vending Machine Management System** - ERP/CRM/CMMS for vending operations with manual operations architecture, photo validation, and comprehensive business logic.

---

## 🎯 Project Overview

VendHub Manager is a **production-ready backend system** for managing vending machine operations at scale. Built with **NestJS 10** and **PostgreSQL 14**, it provides complete control over machines, inventory, tasks, financial tracking, and customer engagement.

---

## 🏗️ Architecture Principles

### Manual Operations Architecture

- **NO direct machine connectivity** - All data collected through operator actions
- **MANDATORY photo validation** - Tasks require before/after photos
- **Complete audit trail** - All inventory movements and changes tracked
- **QR-based customer engagement** - Public complaint submission via QR codes on machines
- **Automated monitoring** - Connectivity tracking with automated offline incident creation

### Tech Stack

- **Backend**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL 14
- **ORM**: TypeORM with migrations
- **Authentication**: JWT with refresh tokens & RBAC
- **API Docs**: Swagger/OpenAPI
- **Notifications**: Email, Telegram Bot, Web Push (VAPID)
- **File Processing**: Excel/CSV import (xlsx, csv-parser)
- **PDF Generation**: PDFKit for reports
- **QR Codes**: QRCode library for machine identification
- **Scheduled Tasks**: NestJS Schedule (cron jobs)
- **Rate Limiting**: @nestjs/throttler

---

## 📦 Quick Start

### Using Docker (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd VendHub

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials and secrets

# 3. Start services
docker-compose up -d

# 4. Access API
# API: http://localhost:3000
# Swagger Docs: http://localhost:3000/api/docs
# Health Check: http://localhost:3000/health
```

### Manual Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure database
cp .env.example .env
# Edit DATABASE_* variables

# 3. Run migrations
npm run migration:run

# 4. Generate VAPID keys (for Web Push)
npm run generate-vapid-keys

# 5. Start development server
npm run start:dev
```

---

## ✨ Core Modules

### 1. **Authentication & Users** 🔐

- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC)
  - **ADMIN** - Full system access
  - **MANAGER** - Operations management
  - **OPERATOR** - Field operations
  - **TECHNICIAN** - Maintenance tasks
- User profile management
- Password reset flow

**Endpoints**: `/auth/*`, `/users/*`

---

### 2. **Machines Management** 🎰

- Complete machine lifecycle management
- **QR Code generation** for each machine (automatic or manual)
- **Connectivity monitoring** - Track online/offline status
- Machine details:
  - Location, model, serial number
  - Payment methods (cash, card, QR, NFC)
  - Assigned operator/technician
  - Capacity and current stock levels
- Status tracking: active, low_stock, error, maintenance, offline, disabled
- Statistics: total revenue, sales count, last refill/collection

**New Features**:

- `POST /machines/:id/ping` - Record connectivity ping
- `GET /machines/:id/qr-code` - Get QR code image (base64)
- `GET /machines/:id/qr-code/download` - Download QR code as PNG
- `POST /machines/:id/qr-code/regenerate` - Regenerate QR code
- `GET /machines/connectivity/status` - Get connectivity stats

**Endpoints**: `/machines/*`

---

### 3. **Task Management** 📋 (CORE FEATURE)

- **Photo-mandatory workflow** - Cannot complete without before/after photos
- Task types:
  - Refill (пополнение)
  - Collection (инкассация)
  - Maintenance (обслуживание)
  - Inspection (проверка)
  - Repair (ремонт)
  - Cleaning (мойка)
- Automatic inventory updates on task completion
- Priority levels: low, medium, high, urgent
- Assignment to operators/technicians
- Overdue task notifications (hourly cron)

**Endpoints**: `/tasks/*`

---

### 4. **3-Level Inventory System** 📦

Complete inventory hierarchy with automatic tracking:

1. **Warehouse Inventory** - Central storage
2. **Operator Inventory** - Personal stock
3. **Machine Inventory** - Loaded in machines

**Features**:

- Automatic transfers between levels via Tasks
- Low stock alerts (automated cron every 6 hours)
- Min/max stock levels
- Real-time stock movements
- Inventory reconciliation

**Endpoints**: `/inventory/*`

---

### 5. **Transactions & Financial Tracking** 💰

- **Transaction types**:
  - SALE - Revenue from machine sales
  - COLLECTION - Cash collection from machine
  - EXPENSE - Operational expenses (transport, supplies, repairs)
  - REFUND - Customer refunds
  - TRANSFER - Inter-machine transfers
- Payment methods: CASH, CARD, QR, ONLINE
- Financial reporting with date ranges
- Machine-specific financial stats
- Expense categorization

**Endpoints**: `/transactions/*`

---

### 6. **Sales Import** 📊 (NEW)

Import sales data from **Excel (.xlsx)** or **CSV** files with intelligent column detection.

**Features**:

- Async file processing
- Intelligent column name detection (Russian & English)
  - Date: 'date'/'Date'/'Дата'/'дата'/'sale_date'
  - Machine: 'machine'/'Machine'/'Аппарат'/'аппарат'
  - Amount: 'amount'/'Amount'/'Сумма'/'сумма'
- Excel date parsing (serial numbers)
- Payment method mapping
- Row-by-row error tracking
- Import status: pending → processing → completed/failed/partial
- Retry failed imports

**Endpoints**:

- `POST /sales-import/upload` - Upload file (multipart/form-data)
- `GET /sales-import` - List imports with filters
- `GET /sales-import/:id` - Get import details
- `POST /sales-import/:id/retry` - Retry failed import
- `DELETE /sales-import/:id` - Delete import

**Supported formats**: `.xlsx`, `.csv`

---

### 7. **Reports & PDF Generation** 📈 (NEW)

Generate professional PDF reports with Russian locale support.

**Report Types**:

1. **Dashboard Report** - Overall system summary
   - Financial: revenue, expenses, collections, net profit
   - Tasks: completion rate, overdue tasks
   - Incidents & complaints
   - Machines status

2. **Machine Report** - Individual machine performance
   - Machine details
   - Financial stats
   - Task statistics
   - Incidents

3. **Sales Report** - Sales details with summary table
   - Total sales, average sale
   - Sales table with pagination

**Features**:

- PDF generation with PDFKit
- Russian locale formatting
- Currency formatting (RUB)
- Professional styling with headers/footers
- Pagination support

**Endpoints**:

- `GET /reports/dashboard` - JSON dashboard data
- `GET /reports/dashboard/pdf` - Download PDF
- `GET /reports/machine/:id` - JSON machine report
- `GET /reports/machine/:id/pdf` - Download PDF
- `GET /reports/user/:id` - User performance report

---

### 8. **Notifications** 🔔

Multi-channel notification system with automatic retries.

**Channels**:

- **IN_APP** - In-application notifications (bell icon)
- **EMAIL** - Email notifications (future)
- **SMS** - SMS notifications (future)
- **TELEGRAM** - Telegram Bot messages
- **WEB_PUSH** - Browser push notifications (NEW)

**Notification Types**:

- Task assignments, completions, overdue
- Low stock alerts (machine & warehouse)
- Incident updates
- Complaint submissions
- System alerts

**Features**:

- Automatic retry for failed notifications (every 5 minutes)
- Read/unread tracking
- Batch notifications
- Deep links to resources

**Endpoints**: `/notifications/*`

---

### 9. **Web Push Notifications** 🔔 (NEW)

Browser push notifications using **VAPID** (Web Push protocol).

**Features**:

- VAPID key generation and management
- Client subscription management
- Multi-device support per user
- Automatic cleanup of invalid subscriptions
- Test notification endpoint

**Setup**:

1. Generate VAPID keys: `npm run generate-vapid-keys`
2. Add keys to `.env`:
   ```env
   VAPID_PUBLIC_KEY=<your-public-key>
   VAPID_PRIVATE_KEY=<your-private-key>
   VAPID_EMAIL=admin@vendhub.com
   ```

**Endpoints**:

- `GET /web-push/public-key` - Get public key for client
- `POST /web-push/subscribe` - Subscribe to push
- `DELETE /web-push/unsubscribe/:endpoint` - Unsubscribe
- `GET /web-push/subscriptions` - User's subscriptions
- `POST /web-push/send` - Send notification (admin)
- `POST /web-push/test` - Send test notification

**Integration**: See `FRONTEND_GUIDE.md` for client-side setup

---

### 10. **Telegram Integration** 📱

Full-featured Telegram bot integration with database-backed user management and QR-code account linking.

**Features**:

- ✅ **User Verification** - Link Telegram accounts to VendHub users via QR code or 6-digit code
- ✅ **Customizable Notifications** - 12 types of notifications with per-user preferences
- ✅ **Interactive Commands** - `/tasks`, `/machines`, `/alerts`, `/stats`
- ✅ **Web Admin Panel** - Configure bot settings at `/telegram/settings`
- ✅ **Message Logging** - Complete audit trail of all bot interactions
- ✅ **Multi-language** - Russian and English support

**Setup**:

1. Create bot with [@BotFather](https://t.me/BotFather)
2. Navigate to admin panel: `/telegram/settings`
3. Paste bot token and configure
4. Users link accounts via `/telegram/link` (QR code or manual code)

**Documentation**: See `TELEGRAM_MODULE_README.md` for full documentation

**Endpoints**: `/telegram/*`

⚠️ **Note**: The old standalone `telegram-bot/` service has been deprecated. Use the integrated module only.

---

### 11. **Incidents Management** 🛠️

Track and resolve machine incidents with severity levels.

**Incident Types**:

- MACHINE_MALFUNCTION - General malfunctions
- PAYMENT_ISSUE - Payment system problems
- PRODUCT_STUCK - Product dispensing issues
- DISPLAY_ERROR - Screen/display errors
- TEMPERATURE_ISSUE - Cooling problems
- MACHINE_OFFLINE - Connectivity lost (auto-created)
- OTHER - Other issues

**Severity Levels**:

- LOW - Minor issues
- MEDIUM - Moderate impact
- HIGH - Significant impact
- CRITICAL - Machine down, revenue loss

**Features**:

- Automatic offline incident creation (cron every 30 min)
- Incident assignment to technicians
- Status tracking: open → in_progress → resolved
- Resolution tracking with notes
- Photo attachments

**Endpoints**: `/incidents/*`

---

### 12. **Customer Complaints** 💬

Public complaint submission via **QR codes** on machines.

**Complaint Types**:

- PRODUCT_QUALITY - Product issues
- PAYMENT_PROBLEM - Payment not processed
- NO_CHANGE - Change not returned
- PRODUCT_NOT_DISPENSED - Product stuck
- MACHINE_DIRTY - Cleanliness issues
- MACHINE_BROKEN - Machine malfunction
- OTHER - Other complaints

**Features**:

- **Public QR endpoint** (no authentication required)
- Customer info collection (optional): name, phone, email
- Rating system (1-5 stars)
- Complaint resolution workflow
- Refund tracking

**Public Endpoint**:

- `POST /complaints/public/qr` - Submit complaint via QR code
  ```json
  {
    "qr_code": "QR-ABC123",
    "complaint_type": "PRODUCT_NOT_DISPENSED",
    "description": "Кофе не выдан, деньги списаны",
    "customer_phone": "+79991234567",
    "rating": 1
  }
  ```

**Management Endpoints**: `/complaints/*`

---

### 13. **Locations & Dictionaries** 📍

- Location management (addresses, zones, routes)
- System dictionaries (machine types, product categories, etc.)

**Endpoints**: `/locations/*`, `/dictionaries/*`

---

### 14. **Nomenclature & Recipes** 🥤

- Product catalog (nomenclature)
- Recipe management for complex products
- Ingredient tracking
- Pricing management

**Endpoints**: `/nomenclature/*`, `/recipes/*`

---

### 15. **Scheduled Tasks** ⏰

Automated background jobs running on schedule:

**Cron Jobs**:

- **Every 5 minutes**: Machine connectivity monitoring
- **Every 5 minutes**: Retry failed notifications
- **Every 30 minutes**: Create incidents for offline machines (>30 min)
- **Every hour**: Check for overdue tasks
- **Every 6 hours**: Low stock alerts (machines & warehouse)
- **Monthly**: Cleanup old read notifications (>30 days)

**Configuration**:

```env
ENABLE_SCHEDULED_TASKS=true
```

---

### 16. **Counterparties Management** 🤝 (NEW)

Comprehensive management of suppliers, landlords, and service providers.

**Features**:

- **Counterparty Types**:
  - SUPPLIER - Product suppliers
  - LANDLORD - Location landlords
  - SERVICE - Service providers
  - OTHER - Other partners
- **Contact Management**: Phone, email, address
- **Legal Information**: INN, bank account (Uzbek format)
- **Balance Tracking**: Track debts and payments
- **Excel Import/Export**: Bulk data management
- **Transaction History**: Full audit trail

**Endpoints**: `/counterparties/*`

---

### 17. **Data Parser Framework** 📊 (NEW)

Universal data parsing and validation for imports.

**Features**:

- **Auto-Format Detection**: Automatically detect file type
- **Multi-Format Support**:
  - Excel (.xlsx, .xls)
  - CSV (with encoding detection)
  - JSON (nested structures)
- **Uzbek-Specific Validation**:
  - Phone: +998 format validation
  - INN: 9 or 14 digit validation
  - Bank Account: 20 digit validation
  - Date: DD.MM.YYYY format
- **Corrupted File Recovery**: Attempt to recover damaged files
- **Batch Validation**: Process thousands of rows
- **Error Reporting**: Row-by-row error tracking

**Specialized Parsers**:

- Sales imports with amount validation
- Counterparties with contact validation
- Inventory with quantity validation

**Endpoints**: `/data-parser/*`

---

### 18. **Report Builder Engine** 📈 (NEW)

Template-based report generation with multiple formats.

**Report Types**:

- **Dashboard Reports**: Key metrics overview
- **Machine Performance**: Efficiency analysis
- **Sales Reports**: Revenue analytics
- **Inventory Reports**: Stock analysis
- **Financial Reports**: P&L statements
- **Tax Reports**: 15% VAT for Uzbekistan
- **Operator Performance**: Staff KPIs
- **Maintenance Reports**: Service history

**Output Formats**:

- JSON (API responses)
- PDF (printable reports)
- Excel (data analysis)
- CSV (data export)
- HTML (web display)

**Features**:

- Template-based generation
- Chart generation support
- Metrics calculation engine
- Data grouping and aggregation
- Insights and recommendations
- Performance caching
- Uzbek-specific formatting

**Endpoints**: `/reports/*`

---

### 19. **Money Utilities** 💵 (NEW)

Comprehensive UZS currency formatting for Uzbekistan market.

**Features**:

- **UZS Formatting**: `1 234 567,89 сум` format
- **Multiple Output Types**:
  - Plain text: "1 234 567,89 сум"
  - HTML: with `<span>` tags
  - Telegram: Markdown formatting
  - Excel: Numeric format
  - PDF: With font styling
- **Parsing**: Convert formatted strings back to numbers
- **Decimal.js Integration**: Precise monetary calculations
- **Russian Locale**: Space thousand separator, comma decimal

**Usage**:

```typescript
MoneyHelper.formatUZS(1234567.89); // "1 234 567,89 сум"
MoneyHelper.parseUZS("1 234 567,89 сум"); // 1234567.89
```

---

## 📈 System Statistics

- **28 Database Entities** (was 24)
- **22 Service Modules** (was 18)
- **220+ API Endpoints** (was 180+)
- **~30,000+ Lines of Production Code** (was ~20,000+)
- **Full CRUD operations** for all entities
- **Comprehensive validation** with class-validator
- **Error handling** with custom exceptions
- **100% TypeScript**
- **100% Production Ready**

---

## 🔐 Security Features

### Authentication & Authorization
- JWT authentication with refresh tokens (15min access / 7d refresh)
- Password hashing with bcrypt (12 rounds)
- Role-Based Access Control (RBAC): ADMIN, MANAGER, OPERATOR, TECHNICIAN
- Session management with device tracking

### API Security
- Rate limiting: 100 requests/minute (configurable per endpoint)
- Request validation with class-validator DTOs
- SQL injection protection (TypeORM parameterized queries)
- XSS protection via input sanitization
- CORS configuration with whitelist
- Helmet security headers (CSP, HSTS, etc.)

### Infrastructure Security
- HTTPS enforcement in production
- Secure cookie settings (httpOnly, sameSite, secure)
- File upload validation (type, size, content)
- Environment variable validation on startup
- Database connection encryption (SSL/TLS)

### Monitoring & Auditing
- Comprehensive audit logging for security events
- Failed login attempt tracking and alerting
- Session anomaly detection
- Rate limit violation monitoring

See `SECURITY.md` for detailed security documentation.

---

## 📡 API Documentation

**Swagger UI**: `http://localhost:3000/api/docs`

All endpoints are documented with:

- Request/response schemas
- Authentication requirements
- Example payloads
- Error codes

---

## 🗄️ Database Schema

**21+ Tables**:

- users, machines, locations
- tasks, inventory (3 tables)
- transactions, sales_imports
- incidents, complaints
- notifications, push_subscriptions
- nomenclature, recipes
- dictionaries, files
- telegram_bot

**Migrations**: Automatic on startup (`migrationsRun: true`)

---

## 📊 Monitoring & Observability

### Prometheus Metrics
- HTTP request duration histograms
- Request count by status code and endpoint
- Database query performance
- Cache hit/miss ratios
- Queue job processing metrics
- Business metrics (tasks, machines, inventory)

### Grafana Dashboards
Three pre-configured dashboards available:
1. **Security Metrics** - Login failures, rate limits, sessions, 2FA success
2. **API Performance** - Response times, error rates, cache performance
3. **Business Metrics** - Tasks, machines status, inventory movements

### Alerting
Pre-configured alerts for:
- Backend/Worker downtime
- High error rates (>5%)
- High response times (P95 > 1s)
- Database connection issues
- Redis memory usage
- Security anomalies (login failures, rate limiting)
- Business KPIs (task completion rate, machine offline rate)

See `monitoring/` directory for Prometheus and Grafana configurations.

---

## 🚀 Deployment

### Production Build

```bash
# Build
npm run build

# Run migrations
npm run migration:run

# Start production server
npm run start:prod
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

See `backend/.env.example` for all configuration options:

- Database credentials
- JWT secrets
- VAPID keys
- Telegram bot token
- SMTP settings
- AWS S3 (optional)
- Sentry DSN (optional)

---

## 📚 Additional Documentation

### For Operations

- **Security Guide**: `SECURITY.md` - Security architecture and practices
- **Deployment Guide**: `DEPLOYMENT.md` - Production deployment procedures
- **Operations Runbook**: `RUNBOOK.md` - Incident response and operational procedures

### For Developers

- **Frontend Guide**: `FRONTEND_GUIDE.md` - Next.js 14 dashboard implementation
- **Telegram Module**: `TELEGRAM_MODULE_README.md` - Telegram bot integration guide
- **Equipment Module**: `EQUIPMENT_MODULE_README.md` - Equipment management guide
- **Claude AI Guide**: `CLAUDE.md` - Complete guide for AI assistants working on this codebase

### For AI Assistants & Code Analysis

- **Analysis Prompts**: `.claude/prompts/` - Comprehensive project analysis templates
  - `project-analysis.md` - Full 4-6 hour deep dive analysis
  - `quick-analysis.md` - 30-60 minute quick health check
  - `README.md` - Usage guide for analysis prompts
- **Automation Scripts**: `scripts/`
  - `quick-analysis.sh` - Automated project health check script
  - Run: `./scripts/quick-analysis.sh` for quick check
  - Run: `./scripts/quick-analysis.sh --full` for comprehensive analysis

### Developer Resources

- **Coding Rules**: `.claude/rules.md` - Mandatory coding standards and patterns
- **Testing Guide**: `.claude/testing-guide.md` - Test requirements and examples
- **Deployment Guide**: `.claude/deployment-guide.md` - Production deployment steps
- **MVP Checklist**: `.claude/phase-1-mvp-checklist.md` - Development roadmap
- **Code Templates**: `.claude/templates/backend/` - Boilerplate for services and controllers

### API & Architecture

- **API Docs**: Swagger at `http://localhost:3000/api/docs`
- **Architecture Principles**: Manual operations, photo validation, 3-level inventory
- **Health Check**: `http://localhost:3000/health`

---

## 🔍 Code Quality & Analysis Framework

VendHub includes a comprehensive analysis framework for monitoring codebase health and quality.

### Quick Health Check

Run automated health checks and get a health score (0-100):

```bash
# Quick mode (30-45 minutes)
./scripts/quick-analysis.sh

# Full mode (60 minutes, includes migrations and performance)
./scripts/quick-analysis.sh --full
```

**What it checks**:

- ✅ ESLint errors and warnings
- ✅ TypeScript type errors
- ✅ Test coverage and failures
- ✅ Security vulnerabilities (npm audit)
- ✅ Build success
- ✅ Code patterns (`any` usage, `console.log`, etc.)
- ✅ Database migrations (full mode)
- ✅ Performance notes (full mode)

**Output**: Timestamped reports in `analysis-reports/` with health score and recommendations.

### Comprehensive Analysis

For deep codebase analysis (4-6 hours), use the comprehensive analysis prompt:

- **Location**: `.claude/prompts/project-analysis.md`
- **Categories**: Architecture, code quality, security, performance, testing, API design, database, DevOps, documentation, business logic
- **Deliverables**: Executive summary, detailed report, improvement roadmap, actionable task list

### Analysis Prompts

- **Quick Analysis**: `.claude/prompts/quick-analysis.md` - Fast 30-60 minute health check
- **Comprehensive Analysis**: `.claude/prompts/project-analysis.md` - Deep 4-6 hour analysis
- **Usage Guide**: `.claude/prompts/README.md` - How to use analysis prompts
- **Implementation Guide**: `.claude/prompts/IMPLEMENTATION_SUMMARY.md` - Complete framework guide

### Health Score Interpretation

- **90-100**: ✅ Excellent (deploy with confidence)
- **80-89**: ✅ Good (minor improvements needed)
- **70-79**: ⚠️ Fair (address high-priority issues)
- **60-69**: ⚠️ Poor (do not deploy)
- **0-59**: ❌ Critical (major work needed)

**See**: `scripts/README.md` for complete documentation on automation scripts.

---

## 🔮 Future Features (Roadmap)

- Equipment Module (components, spare parts, washing schedules)
- Audit Logs (complete change tracking)
- Frontend Dashboard (Next.js 14 with LiquidEther background)
- Mobile App (React Native for operators)
- Advanced Analytics (BI dashboards with Charts)
- ML/AI Features (predictive maintenance, demand forecasting)

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format

# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Run code health check
./scripts/quick-analysis.sh
```

---

## 📝 License

Proprietary - VendHub Manager © 2024-2025

---

## 👨‍💻 Author

Built with ❤️ using **NestJS**, **PostgreSQL**, and modern TypeScript practices.

**VendHub Manager** - Complete vending machine management at your fingertips.
