# Comprehensive Project Analysis Prompt

## 🎯 Objective
Conduct a thorough, multi-dimensional analysis of the VendHub Manager project to identify:
- Architectural strengths and weaknesses
- Code quality issues and improvements
- Security vulnerabilities
- Performance bottlenecks
- Testing gaps
- Documentation deficiencies
- DevOps/deployment readiness
- Database optimization opportunities
- API design inconsistencies
- Compliance with project conventions and best practices

---

## 📋 Analysis Framework

### 1. **Architecture Analysis**

#### 1.1 Backend Architecture
- [ ] Evaluate NestJS module structure and organization
- [ ] Analyze dependency injection patterns
- [ ] Review service layer separation of concerns
- [ ] Check for proper layering (controller → service → repository)
- [ ] Identify circular dependencies
- [ ] Assess code coupling and cohesion
- [ ] Verify adherence to manual operations architecture (no machine connectivity)
- [ ] Review integration points (Telegram, web push, sales import)

**Deliverable**: Architecture diagram + issues list with severity ratings

#### 1.2 Frontend Architecture
- [ ] Evaluate Next.js 14 App Router usage
- [ ] Review component structure and reusability
- [ ] Analyze state management patterns
- [ ] Check for proper client/server component separation
- [ ] Assess routing structure
- [ ] Review data fetching patterns (SSR/CSR/ISR)

**Deliverable**: Frontend architecture assessment + recommendations

#### 1.3 Database Architecture
- [ ] Review entity relationships and normalization
- [ ] Analyze index usage and missing indexes
- [ ] Check for proper foreign key constraints
- [ ] Evaluate query patterns and N+1 issues
- [ ] Review migration history and quality
- [ ] Assess soft delete implementation
- [ ] Verify 3-level inventory model integrity

**Deliverable**: Database schema diagram + optimization recommendations

---

### 2. **Code Quality Analysis**

#### 2.1 Code Standards Compliance
- [ ] Verify naming conventions (kebab-case files, PascalCase classes)
- [ ] Check TypeScript strict mode compliance
- [ ] Review ESLint/Prettier configuration and violations
- [ ] Assess code consistency across modules
- [ ] Check for proper use of path aliases (@/, @modules/, @config/)
- [ ] Review file organization and structure

#### 2.2 Code Smells and Anti-patterns
- [ ] Identify duplicate code (DRY violations)
- [ ] Find overly complex functions (cyclomatic complexity)
- [ ] Locate God objects/services
- [ ] Check for magic numbers and strings
- [ ] Find improper error handling
- [ ] Identify commented-out code
- [ ] Locate TODO/FIXME comments

#### 2.3 TypeScript Quality
- [ ] Check for `any` type usage (should be minimal)
- [ ] Verify proper interface/type definitions
- [ ] Review generic type usage
- [ ] Assess type safety in DTOs and entities
- [ ] Check for proper null/undefined handling

**Deliverable**: Code quality report with metrics + refactoring priorities

---

### 3. **Security Analysis**

#### 3.1 Authentication & Authorization
- [ ] Review JWT implementation (access + refresh tokens)
- [ ] Analyze password hashing (bcrypt configuration)
- [ ] Check RBAC implementation correctness
- [ ] Verify guard usage on all protected endpoints
- [ ] Review role-based access patterns
- [ ] Check for authentication bypass vulnerabilities

#### 3.2 Input Validation & Sanitization
- [ ] Verify all endpoints have DTO validation
- [ ] Check class-validator decorator usage
- [ ] Review file upload validation (type, size)
- [ ] Assess SQL injection prevention (TypeORM usage)
- [ ] Check for XSS vulnerabilities
- [ ] Review NoSQL injection risks (if any)

#### 3.3 Security Best Practices
- [ ] Review CORS configuration
- [ ] Check Helmet.js usage and configuration
- [ ] Verify rate limiting implementation
- [ ] Assess secret management (.env, credentials)
- [ ] Check for exposed sensitive data in logs
- [ ] Review HTTPS enforcement
- [ ] Assess OWASP Top 10 compliance

**Deliverable**: Security audit report with vulnerability ratings (Critical/High/Medium/Low)

---

### 4. **Performance Analysis**

#### 4.1 Backend Performance
- [ ] Identify slow database queries
- [ ] Review missing database indexes
- [ ] Check for N+1 query problems
- [ ] Analyze API response times
- [ ] Review caching implementation (Redis usage)
- [ ] Check for memory leaks
- [ ] Assess job queue performance (BullMQ)

#### 4.2 Frontend Performance
- [ ] Analyze bundle size
- [ ] Check for code splitting opportunities
- [ ] Review image optimization
- [ ] Assess lazy loading implementation
- [ ] Check for unnecessary re-renders
- [ ] Review API call optimization

#### 4.3 Infrastructure Performance
- [ ] Review Docker configuration efficiency
- [ ] Assess database connection pooling
- [ ] Check Redis configuration
- [ ] Review file storage performance (S3/MinIO)

**Deliverable**: Performance analysis report + optimization recommendations

---

### 5. **Testing Analysis**

#### 5.1 Test Coverage
- [ ] Measure unit test coverage (target: >70%)
- [ ] Identify untested modules
- [ ] Review critical path test coverage
- [ ] Check integration test coverage
- [ ] Assess E2E test coverage

#### 5.2 Test Quality
- [ ] Review test organization and structure
- [ ] Check for proper mocking patterns
- [ ] Verify test isolation
- [ ] Assess test maintainability
- [ ] Check for flaky tests
- [ ] Review test data management

#### 5.3 Testing Gaps
- [ ] Identify missing critical tests
- [ ] Check photo validation testing
- [ ] Verify inventory update testing
- [ ] Review task completion flow testing
- [ ] Assess edge case coverage

**Deliverable**: Test coverage report + testing roadmap

---

### 6. **API Design Analysis**

#### 6.1 REST API Consistency
- [ ] Review endpoint naming conventions
- [ ] Check HTTP method usage (GET/POST/PUT/PATCH/DELETE)
- [ ] Verify proper HTTP status codes
- [ ] Assess request/response structure consistency
- [ ] Review pagination implementation
- [ ] Check filtering and sorting patterns

#### 6.2 API Documentation
- [ ] Review Swagger/OpenAPI completeness
- [ ] Check DTO documentation (@ApiProperty)
- [ ] Verify endpoint descriptions
- [ ] Assess example quality
- [ ] Review error response documentation

#### 6.3 API Versioning & Backward Compatibility
- [ ] Check versioning strategy
- [ ] Review breaking change handling
- [ ] Assess deprecation notices

**Deliverable**: API design review + improvement suggestions

---

### 7. **Database Analysis**

#### 7.1 Schema Quality
- [ ] Review normalization vs. denormalization decisions
- [ ] Check constraint usage (FK, unique, check)
- [ ] Verify proper data types
- [ ] Assess nullable vs. non-nullable columns
- [ ] Review default values

#### 7.2 Migration Quality
- [ ] Review migration file organization
- [ ] Check for reversible migrations
- [ ] Verify migration naming conventions
- [ ] Assess migration dependencies

#### 7.3 Query Optimization
- [ ] Identify slow queries
- [ ] Review index usage (EXPLAIN ANALYZE)
- [ ] Check for missing indexes
- [ ] Assess query complexity
- [ ] Review eager vs. lazy loading

**Deliverable**: Database health report + optimization plan

---

### 8. **DevOps & Deployment Readiness**

#### 8.1 CI/CD Pipeline
- [ ] Review GitHub Actions workflows
- [ ] Check automated testing in CI
- [ ] Verify build process
- [ ] Assess deployment automation
- [ ] Review environment management

#### 8.2 Docker & Containerization
- [ ] Review Dockerfile optimization
- [ ] Check Docker Compose configuration
- [ ] Verify multi-stage builds
- [ ] Assess image size optimization

#### 8.3 Production Readiness
- [ ] Review environment variable management
- [ ] Check logging configuration
- [ ] Verify health check endpoints
- [ ] Assess monitoring/observability
- [ ] Review backup strategies
- [ ] Check error tracking setup

**Deliverable**: DevOps readiness checklist + deployment recommendations

---

### 9. **Documentation Analysis**

#### 9.1 Code Documentation
- [ ] Check JSDoc coverage on public methods
- [ ] Review inline comment quality
- [ ] Verify complex logic explanations

#### 9.2 Project Documentation
- [ ] Review README completeness
- [ ] Check CLAUDE.md accuracy
- [ ] Verify setup instructions
- [ ] Assess architecture documentation
- [ ] Review API documentation

#### 9.3 Developer Experience
- [ ] Check onboarding documentation
- [ ] Review coding guidelines
- [ ] Verify contribution guidelines
- [ ] Assess troubleshooting guides

**Deliverable**: Documentation audit + improvement priorities

---

### 10. **Business Logic Analysis**

#### 10.1 Core Workflows
- [ ] Verify task lifecycle implementation
- [ ] Review photo validation correctness
- [ ] Check 3-level inventory flow
- [ ] Assess transaction recording
- [ ] Verify operator assignment logic

#### 10.2 Data Integrity
- [ ] Check for race conditions
- [ ] Review transaction usage
- [ ] Verify data consistency rules
- [ ] Assess validation completeness

#### 10.3 Business Rules Compliance
- [ ] Verify no machine connectivity features
- [ ] Check mandatory photo validation
- [ ] Review inventory update triggers
- [ ] Assess manual operations enforcement

**Deliverable**: Business logic validation report

---

## 🔍 Analysis Process

### Phase 1: Automated Analysis (30 min)
```bash
# Code quality metrics
npm run lint
npm run type-check
npm run test:cov

# Dependency audit
npm audit
npm outdated

# Bundle analysis (frontend)
npm run build -- --analyze

# Database analysis
npm run migration:show
```

### Phase 2: Manual Code Review (2-3 hours)
- Review 5-10 critical modules in-depth
- Analyze key workflows (task completion, inventory updates)
- Check security-sensitive code (auth, file uploads)
- Review database entities and migrations
- Examine API endpoints and DTOs

### Phase 3: Testing & Performance (1-2 hours)
- Run full test suite
- Perform basic load testing
- Check database query performance
- Review application logs
- Test critical user flows

### Phase 4: Documentation Review (30 min)
- Read through all documentation files
- Verify setup instructions
- Check for outdated information

---

## 📊 Deliverables

### 1. Executive Summary (1-2 pages)
- Overall project health score (0-100)
- Top 10 critical issues
- Top 5 quick wins
- Recommended priorities

### 2. Detailed Analysis Report
- Findings organized by category
- Severity ratings (Critical/High/Medium/Low)
- Code examples and recommendations
- Effort estimates (hours/days)

### 3. Improvement Roadmap
- Phase 1: Critical fixes (0-2 weeks)
- Phase 2: High-priority improvements (2-6 weeks)
- Phase 3: Medium-priority enhancements (6-12 weeks)
- Phase 4: Nice-to-have optimizations (backlog)

### 4. Code Quality Metrics
- Test coverage percentage
- Code complexity metrics
- TypeScript strict mode compliance
- ESLint violation counts
- Dependency audit results

### 5. Actionable Task List
- Checklist format for tracking progress
- Owner assignments (if team known)
- Dependency mapping

---

## 🎯 Analysis Criteria

### Severity Definitions

**Critical** 🔴
- Security vulnerabilities (SQL injection, XSS, auth bypass)
- Data corruption risks
- Production-breaking bugs
- Major architectural violations

**High** 🟠
- Performance bottlenecks affecting UX
- Missing critical tests
- Inconsistent business logic
- Significant code quality issues

**Medium** 🟡
- Code duplication
- Missing documentation
- Moderate performance issues
- Non-critical test gaps

**Low** 🟢
- Code style inconsistencies
- Minor refactoring opportunities
- Nice-to-have features
- Documentation improvements

---

## 🚀 Success Criteria

A successful analysis should:
- ✅ Identify actionable improvements (not just complaints)
- ✅ Provide concrete code examples
- ✅ Include effort estimates
- ✅ Prioritize by impact and effort
- ✅ Consider project context (MVP phase, team size)
- ✅ Balance idealism with pragmatism
- ✅ Respect existing architecture decisions
- ✅ Provide learning opportunities

---

## 📝 Analysis Template

```markdown
## [Category] Analysis

### Findings

#### [Issue Title] - [Severity: Critical/High/Medium/Low]

**Location**: `path/to/file.ts:123`

**Issue Description**:
[Clear description of the problem]

**Current Implementation**:
```typescript
// Bad code example
```

**Recommended Solution**:
```typescript
// Good code example
```

**Impact**:
- Security: [None/Low/Medium/High/Critical]
- Performance: [None/Low/Medium/High/Critical]
- Maintainability: [None/Low/Medium/High/Critical]

**Effort**: [Hours/Days]

**Priority**: [P0/P1/P2/P3]

---
```

## 🔧 Tools to Use

### Static Analysis
- ESLint + TypeScript compiler
- SonarQube (if available)
- npm audit / yarn audit
- Dependency vulnerability scanners

### Testing
- Jest coverage reports
- Playwright/Cypress for E2E
- Load testing tools (Artillery, k6)

### Database
- PostgreSQL EXPLAIN ANALYZE
- pg_stat_statements
- Database migration history

### Performance
- Lighthouse (frontend)
- Chrome DevTools
- Backend profiling tools

---

## ⚠️ Important Notes

1. **Context Matters**: VendHub is in MVP phase - don't expect production-grade everything
2. **Manual Operations**: Remember this is a manual operations system - no machine connectivity
3. **Photo Validation**: This is a CRITICAL feature - must work flawlessly
4. **3-Level Inventory**: Core business logic - any issues here are high priority
5. **Respect Decisions**: Some "issues" might be deliberate trade-offs

---

## 📋 Checklist for Analyst

Before starting:
- [ ] Read CLAUDE.md completely
- [ ] Read .claude/rules.md
- [ ] Understand manual operations architecture
- [ ] Review phase-1-mvp-checklist.md
- [ ] Set up local environment
- [ ] Run the application

During analysis:
- [ ] Take notes as you go
- [ ] Document file paths and line numbers
- [ ] Create code examples for issues
- [ ] Test suggested fixes locally
- [ ] Verify issues are reproducible

After analysis:
- [ ] Review all findings
- [ ] Assign severity ratings
- [ ] Prioritize by impact × effort
- [ ] Create actionable task list
- [ ] Provide effort estimates
- [ ] Get feedback on report

---

**Last Updated**: 2025-11-17
**Purpose**: Comprehensive project health assessment
**Audience**: Development team, technical leadership
**Estimated Time**: 4-6 hours for thorough analysis
