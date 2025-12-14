# CLEANUP LIST - VendHub Manager Audit

**Audit Date:** 2025-12-14
**Purpose:** Items to remove, refactor, or consolidate

---

## 1. DIRECTORIES TO DELETE (LEGACY/UNUSED)

### High Priority - Safe to Delete

| Directory | Size | Reason | Risk |
|-----------|------|--------|------|
| `telegram-bot/` | 1 file | Deprecated - functionality moved to `backend/src/modules/telegram/` | None |
| `server/` | 46 files | Legacy Express+tRPC+MySQL stack - completely different architecture | None |
| `client/` | 131 files | Legacy React+Vite+tRPC frontend - replaced by Next.js | None |
| `drizzle/` | 16 files | MySQL schema for server/ - not used by main app | None |

**Total: ~194 files can be deleted**

### Medium Priority - Review First

| Directory | Size | Reason | Action |
|-----------|------|--------|--------|
| `mobile/` | 13 files | Stub React Native app, not functional | Delete or document as future work |
| `shared/` | 3 files | May have some shared types used by legacy stack | Check references first |

---

## 2. FILES TO DELETE (ROOT LEVEL)

### Excessive Documentation (118 .md files in root)

**Keep these essential files:**
```
README.md
CLAUDE.md
CHANGELOG.md
DEPLOYMENT.md
SECURITY.md
RUNBOOK.md
```

**Delete these (move to `/docs/archive/` if needed):**
```
# Analysis/Audit Reports (now outdated)
ANALYSIS_PLAN.md
AUDIT_SUMMARY.md
COMPREHENSIVE_AUDIT_REPORT.md
DATABASE_ANALYSIS_REPORT.md
FRONTEND_ANALYSIS_REPORT.md
PROJECT_REVIEW_REPORT.md
SYSTEM_AUDIT_REPORT_*.md
VENDHUB_SYSTEM_AUDIT_*.md
CODE_REVIEW_SUMMARY.md

# Sprint/Iteration Reports (historical)
SPRINT1_ANALYSIS_REPORT.md
SPRINT2_*.md
SPRINT3_*.md
SPRINT_4_*.md
ITERATION_*_SUMMARY.md
PHASE_*_*.md

# Implementation Reports (completed)
AUTH_*.md (5 files)
IMPLEMENTATION_*.md (3 files)
INTERFACE_*.md (4 files)
IMPROVEMENT_ROADMAP.md

# Status Files (outdated)
STATUS.md
PROJECT_STATUS.md
ACTION_PLAN_*.md
NEXT_STEPS.md

# Setup Guides (consolidate into DEPLOYMENT.md)
DEPLOYMENT_*.md (7 files)
SETUP_*.md (3 files)
QUICK_START*.md (4 files)
*_GUIDE.md (multiple files)

# CI/CD Docs (move to .github/)
CI_CD_DOCUMENTATION.md
CD_WORKFLOW_CONTENT.md
CI_WORKFLOW_CONTENT.md
GITHUB_*.md (4 files)
WORKFLOWS_SETUP.md

# Module-specific (move to module directories)
EQUIPMENT_MODULE_README.md
TELEGRAM_MODULE_README.md
TELEGRAM_INTEGRATION_EXAMPLES.md

# Miscellaneous
ideas.md
todo.md
PR_DESCRIPTION.md
SYNC_*.md
```

**Suggested Action:**
```bash
# Create archive directory
mkdir -p docs/archive/audit-2024
mkdir -p docs/archive/sprints
mkdir -p docs/archive/implementation

# Move old audit reports
mv ANALYSIS_PLAN.md AUDIT_SUMMARY.md docs/archive/audit-2024/
# ... etc
```

---

## 3. BACKEND CLEANUP

### Files in `backend/` root to delete/move:

```
# Delete - old scripts/artifacts
bulk-fix.py
fix-any-types.sh
fix-ts-errors.sh
migrate-excel.py
migrate-xlsx-to-exceljs.sh
quick-fix.sh

# Delete - outdated reports
ACTION_PLAN_TICKETS.md
ANY_TYPES_REPORT.md
BACKEND_*.md (6 files)
BKD-004-COMPLETE.md
COMPREHENSIVE_BACKEND_ANALYSIS_REPORT.md
INVENTORY_QUERY_OPTIMIZATION_SUMMARY.md
MIGRATION_SUCCESS.md
PERFORMANCE_OPTIMIZATION.md
RATE_LIMITING_IMPLEMENTATION.md
SECURITY_AUDIT*.md (3 files)
SESSION_SUMMARY.md
SOFT_DELETE_CASCADE_FIX.md
TYPESCRIPT_*.md (2 files)
typescript-build-report.md
```

### Console.log Cleanup (254 statements)

Run this to find them:
```bash
grep -rn "console.log" backend/src --include="*.ts" | grep -v "spec.ts" | grep -v ".d.ts"
```

Replace with proper logging:
```typescript
// Instead of:
console.log('Debug message', data);

// Use:
this.logger.debug('Debug message', data);
// or
this.logger.log('Info message');
```

### Commented Code in app.module.ts

```typescript
// Line 35 - uncomment or remove
// import { AuditLogModule } from './modules/audit-logs/audit-log.module';

// Line 175 - uncomment or remove
// AuditLogModule,
```

**Action:** Either implement AuditLogModule properly or remove the commented imports.

---

## 4. MIGRATION FILES TO REVIEW

Skip files (not running):
```
1700000000000-AddTelegramSecurityFields.ts.skip
1700000000000-AddUserRolesRelationship.ts.skip
```

**Action:** Either integrate these migrations or delete the .skip files.

---

## 5. DUPLICATE/REDUNDANT CODE

### Duplicate Analytics Controllers
```
backend/src/modules/analytics/analytics.controller.ts
backend/src/modules/analytics/controllers/analytics.controller.ts
```
**Action:** Consolidate into single controller

### Duplicate Audit Log Module
```
backend/src/modules/audit-logs/audit-log.controller.ts
backend/src/modules/security/controllers/audit-log.controller.ts
```
**Action:** Keep one, remove the other

### Multiple Telegram Bot Services
```
backend/src/modules/telegram/telegram-bot.service.ts (stub)
backend/src/modules/telegram/services/telegram-bot.service.ts (real)
backend/src/modules/telegram-bot/telegram-bot.service.ts (duplicate?)
```
**Action:** Consolidate into single service in `/modules/telegram/`

---

## 6. CONFIGURATION CLEANUP

### Remove test/development configs from production:
```yaml
# In docker-compose.yml
# Change default passwords
POSTGRES_PASSWORD: vendhub_password_dev  # Change!
MINIO_ROOT_PASSWORD: vendhub_minio_password_dev  # Change!
JWT_SECRET: dev_jwt_secret_change_in_production  # Change!
```

### Environment Files to Review:
```
.env.example
.env.production.example
.env.railway.example
backend/.env.example
backend/.env.production.example
backend/.env.ready
frontend/.env.example (if exists)
```

**Action:** Consolidate into single `.env.example` with clear documentation

---

## 7. PACKAGE.JSON CLEANUP

### Root package.json scripts review:
- Check if all scripts are needed
- Remove legacy stack references

### Check for unused dependencies:
```bash
cd backend && npx depcheck
cd frontend && npx depcheck
```

---

## 8. SUMMARY

### Delete (Safe):
| Category | Files/Dirs | Size Est. |
|----------|:----------:|-----------|
| Legacy stack (server/, client/, drizzle/) | ~190 files | ~500KB |
| telegram-bot/ | 1 file | ~2KB |
| Old .md files (root) | ~100 files | ~2MB |
| Old .md files (backend/) | ~20 files | ~500KB |
| Old scripts | ~10 files | ~50KB |

### Consolidate:
- 118 root .md files → 6 essential docs
- Multiple analytics controllers → 1
- Multiple audit log controllers → 1
- Multiple telegram services → 1

### Fix:
- 254 console.log → proper logging
- Commented AuditLogModule → enable or remove
- .skip migrations → integrate or remove
- Default passwords → secure values

### Estimated Cleanup Effort: 4-8 hours
