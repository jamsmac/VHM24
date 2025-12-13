# VendHub OS - 90-Day Roadmap

> **Start Date:** 2024-12-13
> **Target Completion:** 2025-03-13

## Overview

This roadmap outlines the phased integration of all VendHub components into a unified, production-ready system.

---

## Phase 1: Foundation (Days 1-30)

### Week 1-2: Data Model Unification

- [ ] **1.1** Audit existing TypeORM entities in VHM24
- [ ] **1.2** Add missing entities from vendhub-bot:
  - [ ] `Material` entity
  - [ ] `Supplier` entity
  - [ ] `MaterialRequest` entity
  - [ ] `RequestItem` entity
  - [ ] `Cart` / `CartItem` entities
- [ ] **1.3** Add entities from VHM24R_1:
  - [ ] `ReconciliationRun` entity
  - [ ] `ReconciliationMismatch` entity
  - [ ] `UnifiedOrder` entity
- [ ] **1.4** Generate and run migrations
- [ ] **1.5** Create seed data for development

### Week 2-3: Core API Development

- [ ] **2.1** Implement `/requests` module (Material Requests)
  - [ ] CRUD operations
  - [ ] Approval workflow
  - [ ] Supplier notification hooks
- [ ] **2.2** Implement `/reconciliation` module
  - [ ] File upload processing
  - [ ] Matching algorithm (from VHM24R_2)
  - [ ] Scoring system
  - [ ] Mismatch reporting
- [ ] **2.3** Enhance `/files` module
  - [ ] Async processing queue (BullMQ)
  - [ ] CSV/XLSX parsers
  - [ ] Progress tracking
- [ ] **2.4** Update API documentation

### Week 3-4: Bot Integration Layer

- [ ] **3.1** Create API client service for bot
- [ ] **3.2** Implement authentication middleware
- [ ] **3.3** Create adapter layer for FSM → API calls
- [ ] **3.4** Test bot ↔ API connectivity

**Phase 1 Deliverables:**
- ✅ Unified data model with migrations
- ✅ Requests module operational
- ✅ Reconciliation module operational
- ✅ Bot can communicate with API

---

## Phase 2: Telegram Bot Upgrade (Days 31-60)

### Week 5-6: FSM Port from Python to Node.js

- [ ] **4.1** Port `catalog.py` handlers:
  - [ ] Category selection
  - [ ] Material selection
  - [ ] Quantity picker
  - [ ] Search functionality
- [ ] **4.2** Port `cart.py` handlers:
  - [ ] View cart
  - [ ] Edit quantities
  - [ ] Remove items
  - [ ] Checkout flow
- [ ] **4.3** Port `warehouse.py` handlers:
  - [ ] Issue bags
  - [ ] Return bags
  - [ ] Stock check

### Week 6-7: Admin & Manager Flows

- [ ] **5.1** Port admin commands from `admin.py`:
  - [ ] User management
  - [ ] Request approvals
  - [ ] Reports generation
- [ ] **5.2** Implement role-based menu system
- [ ] **5.3** Add inline keyboards for quick actions
- [ ] **5.4** Implement notification handlers

### Week 7-8: WebApp Integration

- [ ] **6.1** Port SimpleDynamicAuth from VHM24R_1
- [ ] **6.2** Create WebApp token endpoint
- [ ] **6.3** Implement WebApp button in bot
- [ ] **6.4** Test end-to-end WebApp flow

**Phase 2 Deliverables:**
- ✅ Full FSM flows working in Node.js
- ✅ Role-based menus for all user types
- ✅ WebApp authentication working
- ✅ All vendhub-bot functionality preserved

---

## Phase 3: Frontend Consolidation (Days 61-75)

### Week 9-10: Page Development

- [ ] **7.1** Dashboard page with:
  - [ ] Revenue charts
  - [ ] Task overview
  - [ ] Alerts panel
- [ ] **7.2** Requests management page:
  - [ ] List with filters
  - [ ] Approval actions
  - [ ] History view
- [ ] **7.3** Reconciliation page:
  - [ ] Upload interface
  - [ ] Run configuration
  - [ ] Results viewer
  - [ ] Export functionality
- [ ] **7.4** Reports page:
  - [ ] Report generator
  - [ ] Export options
  - [ ] Scheduled reports

### Week 10-11: UI Polish & Mobile

- [ ] **8.1** Implement responsive design
- [ ] **8.2** Optimize for Telegram WebView
- [ ] **8.3** Add loading states and error handling
- [ ] **8.4** Implement dark mode support

**Phase 3 Deliverables:**
- ✅ All essential pages implemented
- ✅ Mobile-friendly interface
- ✅ WebApp works in Telegram

---

## Phase 4: Production Hardening (Days 76-90)

### Week 12: Testing & Quality

- [ ] **9.1** Unit tests for:
  - [ ] Matching algorithm
  - [ ] Scoring system
  - [ ] Request workflow
- [ ] **9.2** Integration tests for:
  - [ ] Task completion flow
  - [ ] Request approval flow
  - [ ] File import flow
- [ ] **9.3** E2E tests for critical paths
- [ ] **9.4** Performance testing

### Week 13: Security & Monitoring

- [ ] **10.1** Security audit:
  - [ ] Input validation
  - [ ] SQL injection prevention
  - [ ] Rate limiting
  - [ ] CORS configuration
- [ ] **10.2** Implement audit logging
- [ ] **10.3** Setup error tracking (Sentry)
- [ ] **10.4** Configure health checks

### Week 13-14: Migration & Deployment

- [ ] **11.1** Data migration from:
  - [ ] vendhub-bot SQLite
  - [ ] VHM24R_1 PostgreSQL
- [ ] **11.2** DNS and SSL setup
- [ ] **11.3** CI/CD pipeline configuration
- [ ] **11.4** Production deployment
- [ ] **11.5** Monitoring setup

**Phase 4 Deliverables:**
- ✅ Test coverage > 70%
- ✅ Security audit passed
- ✅ Data migrated
- ✅ Production deployed

---

## Success Metrics

### Technical Metrics

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Bot Response Time | < 1s |
| Uptime | > 99.5% |
| Test Coverage | > 70% |
| Error Rate | < 0.1% |

### Business Metrics

| Metric | Target |
|--------|--------|
| Task Completion Rate | > 95% |
| Request Processing Time | < 24h |
| Reconciliation Accuracy | > 98% |
| User Adoption (Bot) | > 90% active |

---

## Risk Mitigation

### High Priority Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Full backups, staged migration, rollback plan |
| Bot downtime | High | Blue-green deployment, feature flags |
| Performance degradation | Medium | Load testing, caching strategy |
| User adoption issues | Medium | Training, documentation, gradual rollout |

### Rollback Plan

1. Keep legacy systems running in parallel for 2 weeks
2. Feature flags for new functionality
3. Database snapshots before major changes
4. Documented rollback procedures

---

## Resource Allocation

### Team Structure

| Role | Allocation | Focus |
|------|------------|-------|
| Backend Developer | 100% | API, modules, integrations |
| Frontend Developer | 80% | Web UI, WebApp |
| DevOps | 30% | Infrastructure, CI/CD |
| QA | 50% | Testing, validation |

### External Dependencies

- Telegram Bot API
- Payment provider APIs (Payme, Click, Uzum)
- Cloud infrastructure (Railway/AWS)
- Object storage (S3/R2)

---

## Weekly Checkpoints

Every Friday:
1. Sprint review meeting
2. Demo of completed features
3. Risk assessment update
4. Next week planning

---

## Phase Completion Criteria

### Phase 1 Complete When:
- [ ] All entities created and migrated
- [ ] Requests API fully functional
- [ ] Reconciliation API operational
- [ ] Bot connects to API successfully

### Phase 2 Complete When:
- [ ] All FSM flows ported
- [ ] All roles have working menus
- [ ] WebApp authentication works
- [ ] No regression from vendhub-bot

### Phase 3 Complete When:
- [ ] All pages implemented
- [ ] Mobile responsive
- [ ] Works in Telegram WebView
- [ ] User acceptance testing passed

### Phase 4 Complete When:
- [ ] Tests pass
- [ ] Security audit passed
- [ ] Data migrated
- [ ] Production stable for 1 week

---

**Document Version:** 1.0.0
**Last Updated:** 2024-12-13
**Owner:** VendHub Team
