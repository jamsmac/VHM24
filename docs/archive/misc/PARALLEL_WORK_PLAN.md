# 🔄 Parallel Work Plan: Beta Testing + TypeScript Fixes

**Strategy:** Развернуть систему в dev mode СЕЙЧАС для beta testing, исправлять TypeScript errors параллельно.

**Timeline:** 4 недели до production-ready

---

## 📅 Week 1: Launch + Reports Module

### 🚀 Day 1 (Monday): Deployment

**Beta Team:**
- [ ] Deploy backend в dev mode
- [ ] Настроить PostgreSQL, Redis, MinIO
- [ ] Применить migrations
- [ ] Verify health checks
- [ ] Create test users (admin, operator)
- [ ] Create test data (machines, nomenclature, recipes)

**Dev Team:**
- [ ] Monitor deployment
- [ ] Fix any deployment issues
- [ ] Setup logging and monitoring
- [ ] Create beta testing guide

**Expected:** System running, accessible via API ✅

---

### 🧪 Day 2-3 (Tuesday-Wednesday): Initial Testing + reports.service.ts

**Beta Team:**
- [ ] Test critical workflow: Sale with inventory deduction
- [ ] Test critical workflow: Refill task
- [ ] Test critical workflow: Collection task
- [ ] Test critical workflow: Complaints via QR
- [ ] Report any bugs found
- [ ] Document any UX issues

**Dev Team:**
- [ ] Fix reports.service.ts (13 errors) - **2 hours**
  - Remove ReportPeriod import
  - Rewrite getDateRange() to use start_date/end_date
  - Fix string statuses → enum statuses
  - Commit + push

**Expected:** Core workflows validated ✅, reports.service.ts fixed ✅

---

### 🔧 Day 4-5 (Thursday-Friday): Continue Testing + admin-dashboard.service.ts

**Beta Team:**
- [ ] Test all task types (refill, collection, cleaning, repair)
- [ ] Test photo uploads
- [ ] Test operator ratings
- [ ] Test incidents reporting
- [ ] Performance testing (load 100 machines)
- [ ] Collect user feedback

**Dev Team:**
- [ ] Fix admin-dashboard.service.ts (8 errors) - **1.5 hours**
  - Add TypeORM operator imports
  - Fix UserRole enum usage
  - Fix MachineStatus enum usage
  - Commit + push
- [ ] Fix manager-dashboard.service.ts (7 errors) - **1.5 hours**
  - Add In() import
  - Fix task.type → task.type_code
  - Commit + push
- [ ] Review beta feedback
- [ ] Fix critical bugs if found

**Expected:** 28 more errors fixed (339 → 311) ✅

**Week 1 Summary:**
- ✅ System deployed and running
- ✅ Core workflows validated
- ✅ Reports module ~50% fixed
- ⏳ Beta testing ongoing

---

## 📅 Week 2: Feedback Integration + Module Fixes

### 🔧 Day 6-7 (Monday-Tuesday): expiry-tracking + warehouse-inventory

**Beta Team:**
- [ ] Test warehouse inventory management
- [ ] Test operator inventory
- [ ] Test machine inventory
- [ ] Test inventory transfers
- [ ] Test low stock alerts
- [ ] Edge case testing

**Dev Team:**
- [ ] Fix expiry-tracking-report.service.ts (7 errors) - **2 hours**
  - Study WarehouseInventory entity
  - Fix field references
  - Commit + push
- [ ] Fix warehouse-inventory-report.service.ts (4 errors) - **1 hour**
- [ ] Implement top beta feedback items
- [ ] Write E2E test: Sale with inventory deduction

**Expected:** 11 more errors fixed (311 → 300) ✅

---

### 🧪 Day 8-9 (Wednesday-Thursday): More Reports + First E2E Tests

**Beta Team:**
- [ ] Test analytics dashboards
- [ ] Test reports generation (what works)
- [ ] Test notifications (Telegram, web push)
- [ ] Test user management
- [ ] Test RBAC (roles and permissions)

**Dev Team:**
- [ ] Fix remaining Reports services (~15 errors) - **3 hours**
  - depreciation-report.service.ts
  - location-performance.service.ts
  - machine-performance.service.ts
  - incidents-stats.service.ts
  - complaints-stats.service.ts
  - network-summary.service.ts
- [ ] Write E2E test: Refill task workflow
- [ ] Write E2E test: Collection task workflow
- [ ] Run all tests, fix failures

**Expected:** Reports module 100% fixed! (300 → ~285) ✅

---

### 📊 Day 10 (Friday): Week Review + Planning

**Beta Team:**
- [ ] Compile week 2 feedback
- [ ] Prioritize issues found
- [ ] Test new fixes deployed

**Dev Team:**
- [ ] Review Reports module fixes
- [ ] Verify all Reports tests pass
- [ ] Plan Week 3 fixes (other modules)
- [ ] Update documentation

**Week 2 Summary:**
- ✅ Reports module 100% fixed
- ✅ E2E tests for critical workflows
- ✅ Beta feedback collected and prioritized
- ⏳ 285 TypeScript errors remaining

---

## 📅 Week 3: Other Modules + Stabilization

### 🔧 Day 11-12 (Monday-Tuesday): data-parser + equipment

**Beta Team:**
- [ ] Test sales import from Excel
- [ ] Test sales import from CSV
- [ ] Test equipment management
- [ ] Test washing schedules
- [ ] Test component tracking

**Dev Team:**
- [ ] Fix data-parser module (~30 errors) - **3 hours**
  - Fix type mismatches
  - Fix unknown parameters
  - Add proper type definitions
- [ ] Fix equipment module (~45 errors) - **4 hours**
  - Fix missing imports
  - Fix LessThan usage
  - Fix type issues
  - Fix component fields

**Expected:** 75 errors fixed (285 → 210) ✅

---

### 🔧 Day 13-14 (Wednesday-Thursday): files + integration + notifications

**Beta Team:**
- [ ] Test file uploads (photos)
- [ ] Test S3 storage
- [ ] Test external integrations
- [ ] Test notification delivery
- [ ] Test notification preferences

**Dev Team:**
- [ ] Fix files module (~20 errors) - **2 hours**
  - Install @types/uuid
  - Fix entity creation issues
  - Fix S3 presigner import
- [ ] Fix integration module (~15 errors) - **1.5 hours**
  - Fix stats type issues
  - Fix webhook async return type
- [ ] Fix notifications module (~25 errors) - **2 hours**
  - Add req type annotations
  - Fix telegramUserId type

**Expected:** 60 errors fixed (210 → 150) ✅

---

### 🧪 Day 15 (Friday): tasks + analytics + testing

**Beta Team:**
- [ ] Full regression testing
- [ ] Performance testing
- [ ] Security testing (basic)
- [ ] Final feedback collection

**Dev Team:**
- [ ] Fix tasks module (~20 errors) - **2 hours**
  - Add req type annotations
- [ ] Fix analytics module (~10 errors) - **1 hour**
  - Fix Roles decorator usage
  - Fix req types
- [ ] Fix remaining modules (~120 errors) - **4 hours**
- [ ] Run full test suite
- [ ] Fix all test failures

**Expected:** All TypeScript errors fixed! (150 → 0) ✅

**Week 3 Summary:**
- ✅ All TypeScript errors fixed
- ✅ Production build passes
- ✅ Full test suite passes
- ✅ Beta testing complete

---

## 📅 Week 4: Production Preparation

### 📝 Day 16-17 (Monday-Tuesday): Documentation

**Tasks:**
- [ ] Complete Swagger API documentation
- [ ] Write user manual для операторов
- [ ] Write admin manual
- [ ] Update deployment guide for production
- [ ] Create troubleshooting guide
- [ ] Update README
- [ ] Create CHANGELOG for v1.0.0

**Expected:** Production-ready documentation ✅

---

### 🔒 Day 18-19 (Wednesday-Thursday): Security & Performance

**Tasks:**
- [ ] Security audit (basic)
- [ ] Fix any security issues found
- [ ] Performance optimization
- [ ] Load testing
- [ ] Database query optimization
- [ ] Add database indexes if needed
- [ ] Setup monitoring (production)

**Expected:** System optimized and secured ✅

---

### 🚀 Day 20 (Friday): Production Deployment

**Morning:**
- [ ] Final code review
- [ ] Final testing in staging
- [ ] Database backup
- [ ] Create production environment
- [ ] Apply migrations to production
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Smoke testing in production

**Afternoon:**
- [ ] Monitor production logs
- [ ] Verify all services running
- [ ] Run health checks
- [ ] User acceptance testing in production
- [ ] 🎉 Go Live!

**Week 4 Summary:**
- ✅ Documentation complete
- ✅ Security hardened
- ✅ Performance optimized
- ✅ Production deployment successful
- 🎉 System 100% ready!

---

## 👥 Team Roles

### Beta Testing Team (2-3 people)
**Responsibilities:**
- Test all features daily
- Report bugs via GitHub Issues
- Provide UX feedback
- Test edge cases
- Performance testing
- Create test data

**Skills needed:**
- Basic understanding of vending machine operations
- Ability to test web APIs (Postman/Insomnia)
- Attention to detail
- Good bug reporting skills

---

### Development Team (1-2 developers)
**Responsibilities:**
- Fix TypeScript errors (systematic approach)
- Monitor beta testing feedback
- Fix critical bugs immediately
- Write E2E tests
- Code review
- Documentation

**Skills needed:**
- TypeScript/NestJS
- TypeORM
- Testing (Jest)
- Git workflow

---

## 📊 Progress Tracking

### Daily Stand-up (15 min)
- What was tested/fixed yesterday?
- What will be tested/fixed today?
- Any blockers?

### Weekly Review (1 hour)
- Demo new features/fixes
- Review metrics
- Plan next week
- Prioritize feedback

### Metrics to Track

**Beta Testing:**
- [ ] Workflows tested: 0/10
- [ ] Bugs found: 0
- [ ] Critical bugs: 0
- [ ] UX issues: 0
- [ ] User feedback items: 0

**Development:**
- [ ] TypeScript errors: 339 → 0
- [ ] Tests written: 9 → 30+
- [ ] Test coverage: 15% → 80%+
- [ ] Documentation: 60% → 100%

---

## 🎯 Success Criteria

### Week 1 ✅
- [ ] System deployed and accessible
- [ ] Core workflows validated
- [ ] No critical bugs blocking usage
- [ ] 28+ TypeScript errors fixed

### Week 2 ✅
- [ ] Reports module 100% fixed
- [ ] 3 E2E tests written
- [ ] Beta feedback prioritized
- [ ] 54+ total errors fixed

### Week 3 ✅
- [ ] All TypeScript errors fixed (0 errors)
- [ ] Production build passes
- [ ] Full test suite passes
- [ ] Beta testing complete

### Week 4 ✅
- [ ] Documentation 100% complete
- [ ] Security audit passed
- [ ] Production deployment successful
- [ ] System 100% ready

---

## 🆘 Risk Mitigation

### Risk: Critical bug found during beta
**Mitigation:**
- Immediate hotfix
- Deploy to dev within 2 hours
- Retest workflow
- Document in CHANGELOG

### Risk: TypeScript fixes break functionality
**Mitigation:**
- Run tests after each fix
- Test critical workflows manually
- Keep changes small and focused
- Commit frequently

### Risk: Timeline slips
**Mitigation:**
- Daily stand-ups to catch issues early
- Can extend Week 3 if needed
- Can deploy to production even with minor TypeScript errors (use dev mode)
- Minimum viable product: Core workflows working

### Risk: Team member unavailable
**Mitigation:**
- Documentation is comprehensive
- Code is well-commented
- Git history is clear
- Can continue with reduced capacity

---

## 📋 Quick Reference

### Start Backend (Dev Mode)
```bash
cd backend
npm run start:dev
```

### Run Tests
```bash
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:cov           # With coverage
```

### Fix TypeScript Errors Workflow
```bash
# 1. Read entity schema
cat src/modules/*/entities/*.entity.ts

# 2. Identify mismatches
npm run build 2>&1 | grep "error TS"

# 3. Fix file
vim src/modules/reports/services/X.service.ts

# 4. Verify fix
npm run build | grep X.service.ts
# Should show no errors

# 5. Commit
git add .
git commit -m "fix(reports): fix TypeScript errors in X.service.ts"
git push
```

### Deploy Fix to Beta
```bash
# Pull latest
git pull

# Restart backend (auto-reloads in dev mode)
# Changes applied immediately
```

---

*Parallel Work Plan - Beta Testing + TypeScript Fixes*
*Timeline: 4 weeks to 100% production-ready*
*Start: Week of 2025-11-18*
