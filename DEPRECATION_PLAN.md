# VendHub OS - Deprecation Plan

> **Version:** 1.0.0
> **Last Updated:** 2024-12-13

## 1. Overview

This document outlines the deprecation strategy for legacy components as functionality is consolidated into VHM24.

---

## 2. Deprecation Timeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DEPRECATION TIMELINE                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Dec 2024        Jan 2025        Feb 2025        Mar 2025                │
│     │               │               │               │                    │
│     ▼               ▼               ▼               ▼                    │
│  ┌─────┐        ┌─────┐        ┌─────┐        ┌─────┐                   │
│  │Phase│        │Phase│        │Phase│        │Phase│                   │
│  │  1  │        │  2  │        │  3  │        │  4  │                   │
│  └─────┘        └─────┘        └─────┘        └─────┘                   │
│     │               │               │               │                    │
│  VHM24/server   vendhub-bot    VHM24R_1       Final                     │
│  deprecated     deprecated     deprecated     cleanup                    │
│                                                                           │
│  VHM24R_2 → Module extraction complete                                   │
│  vendbot_manager → UI migration complete                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Deprecation Details

### 3.1 VHM24/server (Internal)

**Status:** 🔴 DEPRECATED (Phase 1)

**Reason:** Duplicates backend functionality with different ORM (Drizzle vs TypeORM).

**Current State:**
- Location: `/VHM24/server/`
- Stack: Drizzle ORM + MySQL
- Functions: db.ts, routers, telegram, aiAgents

**Migration Actions:**

| Action | Target | Status |
|--------|--------|--------|
| Migrate `db.ts` queries | `backend/src/modules/` | Pending |
| Migrate `routers.ts` | `backend/src/modules/` | Pending |
| Migrate `telegram.ts` | `backend/src/modules/telegram/` | Pending |
| Migrate `aiAgents.ts` | `backend/src/modules/ai/` | Pending |

**Deprecation Schedule:**
- **Week 1-2:** Identify dependencies
- **Week 3-4:** Create equivalent in backend
- **Week 5:** Add deprecation warnings
- **Week 6:** Remove from docker-compose
- **Week 8:** Archive directory

**Breaking Changes:**
- Any direct imports from `server/` will fail
- API endpoints served by server will 404

**Migration Guide:**
```typescript
// BEFORE (deprecated)
import { db } from '../server/db';
const users = await db.query.users.findMany();

// AFTER (new)
import { UsersService } from '@modules/users/users.service';
const users = await usersService.findAll();
```

---

### 3.2 vendhub-bot (Python)

**Status:** 🟡 ACTIVE → 🔴 DEPRECATED (Phase 2)

**Reason:** Consolidating into VHM24 Telegram module for unified codebase.

**Current State:**
- Location: `/vendhub-bot/`
- Stack: Python 3.11 + aiogram 3.x
- Functions: Full FSM flows, admin, warehouse, accountant

**Migration Actions:**

| Component | Target | Status |
|-----------|--------|--------|
| `handlers/catalog.py` | `telegram/handlers/catalog.handler.ts` | Pending |
| `handlers/cart.py` | `telegram/handlers/cart.handler.ts` | Pending |
| `handlers/admin.py` | `telegram/handlers/admin.handler.ts` | Pending |
| `handlers/warehouse.py` | `telegram/handlers/warehouse.handler.ts` | Pending |
| `handlers/accountant.py` | `telegram/handlers/accountant.handler.ts` | Pending |
| `handlers/reports.py` | `telegram/handlers/reports.handler.ts` | Pending |
| `handlers/start.py` | `telegram/handlers/start.handler.ts` | Pending |
| `models/__init__.py` | TypeORM entities | Pending |
| `keyboards/` | `telegram/keyboards/` | Pending |
| `services/` | `telegram/services/` | Pending |
| `database/` | Migrate data to PostgreSQL | Pending |

**Deprecation Schedule:**
- **Week 5-6:** Port all handlers
- **Week 7:** Parallel testing (both bots)
- **Week 8:** Switch webhook to new bot
- **Week 9:** Monitoring period
- **Week 10:** Archive repository

**Data Migration:**
```bash
# Export vendhub-bot SQLite data
sqlite3 data/vendhub.db ".dump" > vendhub_bot_dump.sql

# Convert and import to PostgreSQL
python scripts/migrate_vendhub_bot.py
```

**User Communication:**
- No user-facing changes (same bot token)
- Admin notification on switchover

---

### 3.3 VHM24R_1 (FastAPI Backend)

**Status:** 🟡 ACTIVE → 🔴 DEPRECATED (Phase 3)

**Reason:** Reports/Files functionality moving to VHM24 backend modules.

**Current State:**
- Location: `/VHM24R_1/`
- Stack: FastAPI + SQLAlchemy
- Functions: File processing, reports, SimpleDynamicAuth, Telegram webapp

**Migration Actions:**

| Component | Target | Status |
|-----------|--------|--------|
| `app/models.py` | TypeORM entities | Pending |
| `app/crud.py` | Services layer | Pending |
| `app/telegram_webapp.py` | `telegram/services/webapp-auth.service.ts` | Pending |
| `app/telegram_auth.py` | `auth/strategies/telegram.strategy.ts` | Pending |
| `app/services/` | `backend/src/modules/` | Pending |
| `backend/templates/` | Keep for reference | N/A |

**Deprecation Schedule:**
- **Week 8-9:** Complete module migration
- **Week 10:** Redirect traffic to VHM24
- **Week 11:** Monitoring
- **Week 12:** Archive repository

**API Compatibility:**
```python
# Legacy endpoint
POST /api/v1/upload

# New endpoint (VHM24)
POST /api/v1/files/upload

# Redirect rule (nginx)
location /api/v1/upload {
    return 301 /api/v1/files/upload;
}
```

---

### 3.4 VHM24R_2 (Reconciliation PWA)

**Status:** 🟢 EXTRACT ONLY

**Reason:** Single-file PWA - extract algorithms, don't maintain separately.

**Current State:**
- Location: `/VHM24R_2/`
- Stack: Single index.html with embedded React/JS
- Functions: Payment reconciliation, matching, scoring

**Migration Actions:**

| Component | Target | Status |
|-----------|--------|--------|
| Matching algorithm | `reconciliation/services/matching.service.ts` | Pending |
| Scoring logic | `reconciliation/services/scoring.service.ts` | Pending |
| Table schemas | TypeORM entities | Pending |
| UI components | `frontend/src/pages/reconciliation/` | Pending |

**Timeline:**
- **Week 1-2:** Extract and port algorithms
- **Week 3:** Create UI in frontend
- **Week 4:** Archive repository (keep for reference)

**No deprecation period needed** - standalone tool, no external users.

---

### 3.5 vendbot_manager (React Admin)

**Status:** 🟡 INTEGRATE

**Reason:** Merge best components into VHM24 frontend.

**Current State:**
- Location: `/vendbot_manager/`
- Stack: React 18 + Redux + Vite
- Functions: Admin panel, charts, pages

**Migration Actions:**

| Component | Target | Status |
|-----------|--------|--------|
| Dashboard charts | `frontend/src/components/charts/` | Pending |
| Page layouts | `frontend/src/app/` | Pending |
| Redux patterns | React Context / Zustand | Pending |
| UI components | `frontend/src/components/` | Pending |

**Timeline:**
- **Week 9-10:** Migrate key pages
- **Week 11:** Complete UI parity
- **Week 12:** Archive repository

---

## 4. Deprecation Notices

### 4.1 Code Warnings

Add to deprecated files:

```typescript
/**
 * @deprecated This module is deprecated and will be removed in v3.0.
 * Use @modules/telegram/services/webapp-auth.service.ts instead.
 * Migration guide: docs/MIGRATION_PLAN.md#webapp-auth
 */
```

```python
# DEPRECATED: This file is deprecated and will be removed.
# Functionality moved to VHM24/backend/src/modules/telegram/
# See: MIGRATION_PLAN.md
import warnings
warnings.warn(
    "vendhub-bot is deprecated. Use VHM24 telegram module.",
    DeprecationWarning
)
```

### 4.2 Log Warnings

```typescript
// Log deprecation warnings in runtime
this.logger.warn(
  'DEPRECATED: /api/v1/upload endpoint is deprecated. ' +
  'Use /api/v1/files/upload instead. ' +
  'This endpoint will be removed on 2025-03-01.'
);
```

### 4.3 API Deprecation Headers

```typescript
// Add deprecation headers to responses
response.setHeader('Deprecation', 'true');
response.setHeader('Sunset', 'Sat, 01 Mar 2025 00:00:00 GMT');
response.setHeader('Link', '</api/v1/files/upload>; rel="successor-version"');
```

---

## 5. Archive Strategy

### 5.1 Before Archiving

- [ ] All functionality migrated and tested
- [ ] No active users/integrations
- [ ] Data fully migrated
- [ ] Documentation updated

### 5.2 Archive Process

```bash
# 1. Create final tag
git tag -a v1.0.0-final -m "Final version before deprecation"

# 2. Update README with deprecation notice
echo "# DEPRECATED - See VHM24" > README.md

# 3. Archive repository on GitHub
# Settings → Danger Zone → Archive this repository

# 4. Keep local backup
tar -czf vendhub-bot-archive.tar.gz vendhub-bot/
```

### 5.3 Post-Archive

- Repository read-only on GitHub
- Local backups maintained for 1 year
- Documentation references updated
- Redirect any remaining links

---

## 6. Communication Plan

### 6.1 Internal Team

| Date | Message |
|------|---------|
| Week 1 | Deprecation plan announced |
| Week 4 | Migration progress update |
| Week 8 | Final warning before cutover |
| Week 10 | Cutover complete notification |

### 6.2 External Users (if any)

No external users for these repositories - internal tools only.

---

## 7. Risk Mitigation

### 7.1 Parallel Running

Run old and new systems in parallel during transition:

```yaml
# docker-compose.yml
services:
  backend-new:
    image: vendhub-backend:2.0
    ports:
      - "3000:3000"

  backend-legacy:
    image: vendhub-backend:1.0
    ports:
      - "3001:3000"
    environment:
      - DEPRECATION_MODE=true
```

### 7.2 Feature Flags

```typescript
// Use feature flags for gradual rollout
if (featureFlags.useNewReconciliation) {
  return this.newReconciliationService.run(params);
} else {
  return this.legacyReconciliationService.run(params);
}
```

### 7.3 Rollback Plan

Each deprecated component has rollback procedure:

```bash
# Rollback to vendhub-bot
railway link vendhub-bot
railway up

# Update Telegram webhook
curl -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -d "url=https://vendhub-bot.railway.app/webhook"
```

---

## 8. Checklist

### Phase 1: VHM24/server

- [ ] Functionality mapped
- [ ] Migration scripts ready
- [ ] Backend modules created
- [ ] Tests passing
- [ ] Deprecation warnings added
- [ ] Removed from docker-compose
- [ ] Directory archived

### Phase 2: vendhub-bot

- [ ] All handlers ported
- [ ] FSM flows tested
- [ ] Data migrated
- [ ] Webhook switched
- [ ] Monitoring stable
- [ ] Repository archived

### Phase 3: VHM24R_1

- [ ] API endpoints migrated
- [ ] SimpleDynamicAuth ported
- [ ] File processing tested
- [ ] Traffic redirected
- [ ] Repository archived

### Phase 4: Final Cleanup

- [ ] All repositories archived
- [ ] Documentation updated
- [ ] Backups verified
- [ ] Team notified

---

**Document Version:** 1.0.0
**Last Updated:** 2024-12-13
**Owner:** VendHub Team
