# ALL 20 ANALYSIS PROMPTS - MASTER INDEX
## Complete Production-Ready Analysis Framework for VendHub

**Created:** 2025-11-21
**Last Updated:** 2025-11-25
**Status:** COMPLETE - ALL 20 PROMPTS DOCUMENTED
**Total Size:** ~600KB documentation
**Total Time:** 80-100 hours (full audits)
**Coverage:** Full-stack + DevOps + Quality + Security

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Core Development Prompts (1-4)](#core-development-prompts-1-4)
3. [DevOps & Quality Prompts (5-8)](#devops--quality-prompts-5-8)
4. [Code Quality Prompts (9-12)](#code-quality-prompts-9-12)
5. [Infrastructure Prompts (13-16)](#infrastructure-prompts-13-16)
6. [Specialized Prompts (17-20)](#specialized-prompts-17-20)
7. [Usage Guide](#usage-guide)
8. [Scoring Framework](#scoring-framework)
9. [Production Readiness Checklist](#production-readiness-checklist)
10. [VendHub-Specific Usage](#vendhub-specific-usage)

---

## OVERVIEW

This document provides a comprehensive framework of 20 analysis prompts for auditing, improving, and maintaining production-quality codebases. Each prompt includes:

- **Focus Areas**: Specific technologies and concerns
- **Time Estimates**: Realistic effort for full vs critical-only audits
- **Checkpoints**: Detailed verification items
- **Key Areas**: Primary concerns to address

---

## CORE DEVELOPMENT PROMPTS (1-4)

### 1. Frontend Analysis

**Focus:** React, TypeScript, UI/UX, Performance, Accessibility
**Time:** 8-10h (full) / 3-4h (critical)
**Coverage:** 150+ checkpoints

**Key Areas:**
- Component architecture and composition patterns
- TypeScript quality (strict mode, proper typing)
- State management (Redux/Context optimization)
- Performance (React.memo, useMemo, lazy loading)
- Accessibility (WCAG 2.1 AA compliance)
- Bundle size optimization (<500KB target)
- Error boundaries and fallback UIs

**VendHub-Specific Checks:**
- Dashboard widget performance
- Task list rendering optimization
- Photo upload components
- Mobile-responsive layouts
- Operator-facing UI simplicity

**Sample Analysis Command:**
```
"Analyze the VendHub frontend focusing on:
1. Component architecture in src/components/
2. TypeScript strictness and type coverage
3. Performance issues (re-renders, bundle size)
4. Accessibility compliance (WCAG 2.1 AA)
5. State management patterns

Provide scores for each area and top 10 critical issues."
```

---

### 2. Backend Analysis

**Focus:** NestJS, TypeORM, API Design, Business Logic
**Time:** 6-10h (full) / 2-3h (critical)
**Coverage:** 150+ checkpoints

**Key Areas:**
- **Part 1**: Code Quality & Architecture
  - Module organization
  - Dependency injection patterns
  - Error handling consistency
  - Code duplication

- **Part 2**: API Design & Business Logic
  - REST conventions
  - DTO validation
  - Business rule implementation
  - Photo validation enforcement

- **Part 3**: Database & Performance
  - Query optimization
  - N+1 prevention
  - Transaction handling
  - Caching strategies

- **Part 4**: Security & Summary
  - Authentication/Authorization
  - Input validation
  - Rate limiting
  - Audit logging

**VendHub-Specific Checks:**
- Photo validation in task completion
- 3-level inventory flow (warehouse → operator → machine)
- Manual operations architecture (NO machine connectivity)
- Task type handling (refill, collection, maintenance, etc.)

**Sample Analysis Command:**
```
"Analyze the VendHub backend focusing on:
1. NestJS module patterns in backend/src/modules/
2. API design and DTO validation
3. Business logic correctness (especially task workflows)
4. Database query performance
5. Security implementation

Check for photo validation and inventory flow compliance."
```

---

### 3. Database Analysis

**Focus:** PostgreSQL, Indexing, Migrations, PITR
**Time:** 4-6h (full) / 1-2h (critical)
**Coverage:** 100+ checkpoints

**Key Areas:**
- **Part 1**: Schema Design & Data Types
  - Table normalization
  - Appropriate data types
  - Nullable column usage
  - Default values

- **Part 2**: Indexing & Query Performance
  - Foreign key indexes
  - Composite indexes
  - Query explain analysis
  - Slow query identification

- **Part 3**: Integrity, Migrations & Backup
  - Referential integrity
  - Migration safety
  - Backup procedures
  - Point-in-time recovery

**VendHub-Specific Checks:**
- 29 table schema compliance
- 3-level inventory table relationships
- Task/photo relationship integrity
- Soft delete implementation (deleted_at)
- Audit fields (created_by_id, updated_by_id)

**Sample Analysis Command:**
```
"Analyze the VendHub database focusing on:
1. Schema design for 29 tables
2. Index coverage (especially FKs)
3. Query performance (identify slow queries)
4. Migration safety and rollback procedures
5. Backup and recovery capabilities

Run EXPLAIN on critical queries and suggest optimizations."
```

---

### 4. Security Analysis

**Focus:** OWASP Top 10 2021, Authentication, Encryption
**Time:** 6-8h (full) / 2-3h (critical)
**Coverage:** 80+ checkpoints

**Key Areas:**
- **Authentication**
  - bcrypt password hashing (salt ≥10)
  - JWT implementation (access 15min, refresh 7 days)
  - 2FA for admin users (TOTP, SMS, Telegram)
  - Session management

- **Injection Prevention**
  - SQL injection (parameterized queries)
  - XSS (input sanitization, CSP)
  - Command injection
  - Path traversal

- **Data Protection**
  - Encryption at rest
  - PII handling (GDPR compliance)
  - Secrets management
  - File upload security

- **API Security**
  - Rate limiting (100 req/min default)
  - CORS configuration
  - CSP headers
  - HTTPS enforcement

**VendHub-Specific Checks:**
- REQ-AUTH-01 to REQ-AUTH-81 compliance
- Telegram bot security
- Photo upload validation
- Role-based access (SuperAdmin, Admin, Manager, Operator, Technician)

**Sample Analysis Command:**
```
"Perform security audit on VendHub focusing on:
1. Authentication implementation (JWT, bcrypt, 2FA)
2. OWASP Top 10 2021 vulnerabilities
3. Input validation and injection prevention
4. Rate limiting and API protection
5. Secrets management and encryption

Check compliance with REQ-AUTH requirements."
```

---

## DEVOPS & QUALITY PROMPTS (5-8)

### 5. Testing Strategy

**Focus:** Unit, Integration, E2E Testing, Coverage
**Time:** 4-6h (full) / 1-2h (critical)
**Target:** 80%+ code coverage

**Key Areas:**
- **Test Pyramid**
  - 60% unit tests
  - 30% integration tests
  - 10% E2E tests

- **Tools**
  - Jest (unit/integration)
  - Playwright (E2E)
  - Supertest (API testing)

- **Coverage Enforcement**
  - Line coverage thresholds
  - Branch coverage
  - CI/CD integration

- **Best Practices**
  - Test isolation
  - Mock strategies
  - Fixture management
  - Test naming conventions

**Sample Analysis Command:**
```
"Analyze VendHub testing strategy:
1. Current test coverage by module
2. Test pyramid compliance
3. Critical path coverage (auth, tasks, inventory)
4. E2E test scenarios
5. CI/CD test integration

Identify gaps and provide coverage improvement plan."
```

---

### 6. CI/CD Pipeline

**Focus:** Build, Deploy, Monitor, Rollback
**Time:** 4-5h (full) / 1-2h (critical)

**Key Areas:**
- **Build Pipeline**
  - GitHub Actions configuration
  - Docker image building
  - Asset compilation
  - Dependency caching

- **Deployment**
  - Blue-green deployment
  - Rolling updates
  - Canary releases
  - Environment promotion

- **Monitoring**
  - Deployment health checks
  - Post-deploy verification
  - Metrics collection

- **Rollback**
  - Automated rollback triggers
  - Manual rollback procedures
  - Database migration rollback

**Sample Analysis Command:**
```
"Audit VendHub CI/CD pipeline:
1. GitHub Actions workflow efficiency
2. Docker build optimization
3. Deployment strategy (blue-green, rolling)
4. Rollback procedures
5. Environment configuration management

Provide recommendations for deployment reliability."
```

---

### 7. Performance Guide

**Focus:** Frontend, Backend, Database, Network
**Time:** 4-5h (full) / 1-2h (critical)

**Targets:**
- LCP (Largest Contentful Paint) < 2.5s
- API P95 response time < 500ms
- Database P95 query time < 100ms

**Key Areas:**
- **Frontend**
  - Bundle optimization
  - Lazy loading
  - Image optimization
  - Caching strategies

- **Backend**
  - Redis caching
  - Query optimization
  - Connection pooling
  - Async processing

- **Database**
  - Index optimization
  - Query tuning
  - Read replicas
  - Connection management

- **Network**
  - CDN usage
  - Compression
  - HTTP/2
  - Keep-alive

**Sample Analysis Command:**
```
"Analyze VendHub performance:
1. Frontend bundle size and loading performance
2. API response times (P50, P95, P99)
3. Database query performance
4. Caching effectiveness
5. Network optimization

Identify top 10 performance bottlenecks with fixes."
```

---

### 8. API Documentation

**Focus:** OpenAPI, REST Best Practices, Examples
**Time:** 3-4h (full) / 1h (critical)

**Key Areas:**
- **OpenAPI/Swagger**
  - Complete endpoint documentation
  - Request/response schemas
  - Authentication documentation
  - Error response formats

- **REST Best Practices**
  - Resource naming
  - HTTP method usage
  - Status code consistency
  - Pagination patterns

- **Examples**
  - cURL examples
  - JavaScript/TypeScript snippets
  - Python examples
  - Postman collection

- **Versioning**
  - API versioning strategy
  - Deprecation policy
  - Changelog maintenance

**Sample Analysis Command:**
```
"Audit VendHub API documentation:
1. OpenAPI/Swagger completeness
2. REST convention compliance
3. Example quality and accuracy
4. Error response documentation
5. Authentication documentation

Generate missing documentation and examples."
```

---

## CODE QUALITY PROMPTS (9-12)

### 9. Code Review Checklist

**Focus:** PR Reviews, Code Standards, Best Practices
**Time:** 2-3h per PR

**Review Weights:**
- Functionality (25%)
- Code Quality (20%)
- Testing (20%)
- Security (15%)
- Performance (10%)
- Maintainability (10%)

**Checklist Categories:**
- [ ] Functionality works as intended
- [ ] Code follows project conventions
- [ ] Tests cover new/changed code
- [ ] No security vulnerabilities
- [ ] No performance regressions
- [ ] Code is readable and maintainable
- [ ] Documentation updated
- [ ] No unnecessary changes

**Sample Usage:**
```
"Review this PR against VendHub code review checklist:
1. Does it follow NestJS module patterns?
2. Are DTOs properly validated?
3. Is photo validation enforced (if task-related)?
4. Are tests included?
5. Is the code readable and maintainable?"
```

---

### 10. System Architecture

**Focus:** Layers, Patterns, Scalability
**Time:** 4-6h (full architecture review)

**Key Areas:**
- **Layered Architecture**
  - Controller layer
  - Service layer
  - Repository layer
  - Entity layer

- **Design Patterns**
  - Repository pattern
  - DTO pattern
  - Guard pattern
  - Decorator pattern

- **Scalability**
  - Horizontal scaling readiness
  - Stateless design
  - Caching architecture
  - Queue-based processing

- **Event-Driven**
  - Event emitters
  - Message queues
  - Webhook patterns

**Sample Analysis Command:**
```
"Review VendHub system architecture:
1. Layer separation and dependencies
2. Design pattern usage
3. Horizontal scaling readiness
4. Coupling and cohesion analysis
5. Microservices migration path

Identify architectural improvements."
```

---

### 11. Dependency Management

**Focus:** npm audit, Updates, Licenses
**Time:** 2-3h (full audit)

**Key Areas:**
- **Security Vulnerabilities**
  - CVE detection
  - Critical updates
  - npm audit results
  - Snyk scanning

- **Outdated Packages**
  - Major version updates
  - Breaking changes assessment
  - Update prioritization

- **License Compliance**
  - License compatibility
  - Attribution requirements
  - Commercial restrictions

- **Cleanup**
  - Unused dependencies
  - Duplicate dependencies
  - Size optimization

**Sample Analysis Command:**
```
"Audit VendHub dependencies:
1. Run npm audit and analyze results
2. Identify outdated packages
3. Check license compatibility
4. Find unused dependencies
5. Recommend update strategy"
```

---

### 12. Error Handling & Logging

**Focus:** Exceptions, Logging, Error Tracking
**Time:** 2-3h (full review)

**Key Areas:**
- **Exception Handling**
  - Try-catch coverage
  - Custom exception types
  - Error propagation
  - Fallback behaviors

- **Logging**
  - Structured logging (JSON)
  - Log levels (debug, info, warn, error)
  - Contextual information
  - Sensitive data masking

- **Error Tracking**
  - Sentry integration
  - Error grouping
  - Stack trace handling
  - User context

- **User-Friendly Errors**
  - Error message localization
  - Helpful error descriptions
  - Recovery suggestions

**Sample Analysis Command:**
```
"Analyze VendHub error handling:
1. Exception handling patterns
2. Logging consistency and quality
3. Error tracking integration
4. User-facing error messages
5. Error recovery mechanisms

Identify gaps and recommend improvements."
```

---

## INFRASTRUCTURE PROMPTS (13-16)

### 13. Monitoring & Observability

**Focus:** Metrics, Alerts, Logs, Tracing
**Time:** 2-3h

**Key Areas:**
- **Metrics**
  - Prometheus integration
  - Custom metrics
  - Business metrics
  - SLI/SLO tracking

- **Dashboards**
  - Grafana setup
  - Key performance indicators
  - Real-time monitoring

- **Alerting**
  - Alert rules
  - Escalation policies
  - On-call rotation

- **Tracing**
  - Distributed tracing
  - Request correlation
  - Performance profiling

**Sample Analysis Command:**
```
"Review VendHub monitoring:
1. Health check coverage
2. Metrics collection
3. Alert rules and thresholds
4. Dashboard completeness
5. Log aggregation

Recommend monitoring improvements."
```

---

### 14. Data Migration Strategy

**Focus:** Safe Migrations, Rollback
**Time:** 3-4h

**Key Areas:**
- **Migration Planning**
  - Impact assessment
  - Rollback procedures
  - Testing strategy
  - Communication plan

- **TypeORM Migrations**
  - Up/down methods
  - Data preservation
  - Index management
  - Constraint handling

- **Data Integrity**
  - Validation scripts
  - Consistency checks
  - Referential integrity

- **Rollback**
  - Automated rollback
  - Data recovery
  - State verification

**Sample Analysis Command:**
```
"Analyze VendHub migration strategy:
1. Migration file quality
2. Rollback procedure completeness
3. Data integrity validation
4. Testing coverage
5. Deployment safety

Identify migration risks and mitigations."
```

---

### 15. Backup & Disaster Recovery

**Focus:** Backups, PITR, DR Plan
**Time:** 3-4h

**Key Areas:**
- **Automated Backups**
  - Backup schedule
  - Retention policy
  - Verification testing

- **Off-site Storage**
  - Geographic redundancy
  - Encryption at rest
  - Access controls

- **Recovery Testing**
  - Regular restore tests
  - Recovery time validation
  - Procedure documentation

- **RTO/RPO Targets**
  - Recovery Time Objective
  - Recovery Point Objective
  - SLA compliance

**Sample Analysis Command:**
```
"Audit VendHub backup and DR:
1. Backup automation and schedule
2. Off-site storage configuration
3. Recovery procedure documentation
4. RTO/RPO compliance
5. Regular testing evidence

Recommend DR improvements."
```

---

### 16. Scalability & Load Testing

**Focus:** Scaling, k6, Performance
**Time:** 4-5h

**Key Areas:**
- **Horizontal Scaling**
  - Stateless design
  - Load balancer configuration
  - Session management

- **Load Testing**
  - k6 test scripts
  - Realistic load profiles
  - Performance baselines

- **Auto-scaling**
  - Scaling triggers
  - Warm-up procedures
  - Cost optimization

- **Performance Targets**
  - Concurrent users
  - Transactions per second
  - Response time SLAs

**Sample Analysis Command:**
```
"Analyze VendHub scalability:
1. Horizontal scaling readiness
2. Load testing coverage
3. Auto-scaling configuration
4. Performance under load
5. Bottleneck identification

Create load testing plan and targets."
```

---

## SPECIALIZED PROMPTS (17-20)

### 17. Accessibility (WCAG)

**Focus:** WCAG 2.1 Level AA Compliance
**Time:** 3-4h

**Key Areas:**
- **Keyboard Navigation**
  - Focus management
  - Tab order
  - Keyboard shortcuts

- **Screen Reader Support**
  - Semantic HTML
  - ARIA labels
  - Live regions

- **Visual Accessibility**
  - Color contrast (4.5:1 minimum)
  - Font sizing
  - Responsive design

- **Forms and Errors**
  - Label associations
  - Error identification
  - Input assistance

**Sample Analysis Command:**
```
"Audit VendHub accessibility:
1. Keyboard navigation testing
2. Screen reader compatibility
3. Color contrast analysis
4. ARIA usage correctness
5. Form accessibility

Identify WCAG 2.1 AA violations."
```

---

### 18. SEO & Web Performance

**Focus:** Core Web Vitals, SEO
**Time:** 2-3h

**Key Areas:**
- **Core Web Vitals**
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)

- **SEO**
  - Meta tags
  - Structured data
  - Sitemap
  - robots.txt

- **Performance**
  - Image optimization
  - Lazy loading
  - Caching headers
  - CDN usage

**Sample Analysis Command:**
```
"Analyze VendHub web performance:
1. Core Web Vitals scores
2. SEO meta tag completeness
3. Image optimization
4. Caching effectiveness
5. Mobile performance

Provide optimization recommendations."
```

---

### 19. Mobile App Analysis

**Focus:** React Native Specific
**Time:** 4-5h

**Key Areas:**
- **Performance**
  - JavaScript thread performance
  - Native bridge efficiency
  - Memory management

- **Platform-Specific**
  - iOS guidelines
  - Android guidelines
  - Platform detection

- **Offline Support**
  - Local storage
  - Sync strategies
  - Conflict resolution

- **Deployment**
  - App Store requirements
  - Play Store requirements
  - OTA updates

**Sample Analysis Command:**
```
"Analyze VendHub mobile app:
1. React Native performance
2. Platform-specific implementations
3. Offline capability
4. App store compliance
5. Update mechanisms

Identify mobile-specific issues."
```

---

### 20. Technical Debt Assessment

**Focus:** Debt Tracking, Prioritization
**Time:** 4-5h

**Key Areas:**
- **Code Quality Debt**
  - Code duplication
  - Complex functions
  - Outdated patterns

- **Test Coverage Debt**
  - Missing tests
  - Flaky tests
  - Incomplete scenarios

- **Documentation Debt**
  - Missing docs
  - Outdated docs
  - Incomplete examples

- **Dependency Debt**
  - Outdated packages
  - Security vulnerabilities
  - Deprecated APIs

**Prioritization Framework:**
- **P0**: Security vulnerabilities, data loss risks
- **P1**: Performance issues, stability concerns
- **P2**: Maintainability, developer experience
- **P3**: Nice-to-have improvements

**Sample Analysis Command:**
```
"Assess VendHub technical debt:
1. Identify code quality issues
2. Find test coverage gaps
3. Document missing documentation
4. Catalog dependency updates needed
5. Prioritize by impact and effort

Create technical debt backlog with estimates."
```

---

## USAGE GUIDE

### Quick Start (10-20 hours)
```
Priority 1: Security Analysis (Critical) - 2-3h
Priority 2: Database indexes - 1-2h
Priority 3: Test coverage - 2-4h
Priority 4: Performance - 2-3h
Priority 5: Code review - 2-3h
```

### Full Audit (80-100 hours)
```
Week 1: Core Development (1-4) - 30-35h
Week 2: DevOps & Quality (5-8) - 20-25h
Week 3: Code Quality (9-12) - 15-20h
Week 4: Infrastructure (13-16) - 15-20h
Week 5: Specialized (17-20) - 15-20h
```

### Critical Path (15-25 hours)
```
Day 1: Security critical items (2-3h)
Day 2: Database critical items (1-2h)
Day 3: Performance critical items (2-3h)
Day 4: Testing critical items (2-3h)
Day 5: CI/CD setup (2-3h)
Days 6-10: Code review & fixes (10-15h)
```

---

## SCORING FRAMEWORK

### Overall Score Calculation
```
Overall Score = (
  Frontend (20%) +
  Backend (25%) +
  Database (15%) +
  Security (20%) +
  Testing (10%) +
  CI/CD (5%) +
  Performance (5%)
) / 100
```

### Grade Scale
```
90-100: Excellent - Production ready, world-class
80-89:  Good - Production ready, minor improvements needed
70-79:  Fair - Needs work before production
0-69:   Poor - Not production ready
```

### Per-Area Scoring
Each area scored 0-100 based on:
- Completeness (30%)
- Correctness (30%)
- Best Practices (20%)
- Documentation (10%)
- Testing (10%)

---

## PRODUCTION READINESS CHECKLIST

### Must Have (P0)
- [ ] Security score ≥85/100
- [ ] No critical vulnerabilities
- [ ] All passwords hashed (bcrypt ≥10 rounds)
- [ ] JWT with appropriate expiry
- [ ] HTTPS everywhere
- [ ] All foreign keys indexed
- [ ] No slow queries (>100ms)
- [ ] Test coverage ≥80%
- [ ] Automated CI/CD
- [ ] Monitoring + alerting
- [ ] Automated backups

### Should Have (P1)
- [ ] Frontend score ≥80/100
- [ ] Backend score ≥80/100
- [ ] Lighthouse score ≥90
- [ ] Bundle size <500KB
- [ ] API P95 <500ms
- [ ] 2FA for admin users
- [ ] Blue-green deployment
- [ ] Read replicas (for scale)
- [ ] Redis caching
- [ ] E2E test suite

### Nice to Have (P2)
- [ ] All scores ≥90/100
- [ ] Service worker (PWA)
- [ ] WebP images
- [ ] CDN configured
- [ ] Canary releases
- [ ] Feature flags
- [ ] Visual regression tests

---

## VENDHUB-SPECIFIC USAGE

### Sprint 1 (Authentication)
```
Prompts to use:
- #4 Security Analysis (REQ-AUTH-01 to 81 compliance)
- #2 Backend Analysis (auth module patterns)
- #5 Testing Strategy (auth test coverage)

Key checks:
- bcrypt implementation (≥10 rounds)
- JWT access/refresh tokens
- 2FA setup
- Rate limiting
- Telegram bot authentication
```

### Sprint 2 (Master Data)
```
Prompts to use:
- #3 Database Analysis (29 tables schema)
- #2 Backend Analysis (master data modules)
- #8 API Documentation (REST endpoints)

Key checks:
- Schema design quality
- Index coverage
- API documentation completeness
- Validation patterns
```

### Sprint 3 (Operations)
```
Prompts to use:
- #2 Backend Analysis (tasks, components)
- #7 Performance Guide (query optimization)
- #5 Testing Strategy (integration tests)

Key checks:
- Photo validation enforcement
- 3-level inventory flow
- N+1 query prevention
- Business logic correctness
```

### Sprint 4 (Analytics)
```
Prompts to use:
- #7 Performance Guide (calculation optimization)
- #3 Database Analysis (query performance)
- #1 Frontend Analysis (charts, dashboards)

Key checks:
- Calculation performance
- Dashboard rendering
- Data aggregation efficiency
- Caching strategies
```

---

## TOOLS & RESOURCES

### Automated Scanners
| Area | Tools |
|------|-------|
| Frontend | Lighthouse, Webpack Bundle Analyzer |
| Backend | SonarQube, ESLint, TypeScript strict |
| Database | pg_stat_statements, EXPLAIN ANALYZE |
| Security | npm audit, Snyk, OWASP ZAP |
| Testing | Jest, Playwright, k6 |
| CI/CD | GitHub Actions, Docker |
| Monitoring | Grafana, Prometheus, Sentry |

### Standards Covered
- OWASP Top 10 2021
- CWE Top 25
- WCAG 2.1 Level AA
- Google Core Web Vitals
- Test Pyramid
- 12-Factor App
- REST Best Practices
- GitOps

---

## SUCCESS METRICS

### Project Passes If:
- Overall score ≥80/100
- Security score ≥85/100
- Zero P0 issues
- All P1 issues have fix plans
- Production checklist ≥90% complete

### Expected Outcomes:
- Comprehensive audit reports
- Prioritized issue list (P0-P3)
- 30/60/90 day action plan
- ROI estimates
- Go/No-Go decision
- Team training materials

---

## QUICK START COMMANDS

### Option 1: Full Audit
```
"Perform comprehensive audit on VendHub using all 20 prompts.
Provide:
- Overall score
- Top 20 critical issues
- 90-day action plan"
```

### Option 2: Critical Issues Only
```
"Find P0/P1 issues in VendHub using:
- Security Analysis
- Database Analysis
- Performance Guide

Provide immediate fixes with code examples."
```

### Option 3: Sprint-Specific
```
"Analyze VendHub Sprint [1-4] using relevant prompts.
Check compliance with sprint requirements.
Provide improvement recommendations."
```

### Option 4: Code Review
```
"Review recent changes against code review checklist.
Focus on:
- Security vulnerabilities
- Performance regressions
- Test coverage
- Code quality"
```

---

## DOCUMENT HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-21 | Initial creation with all 20 prompts |
| 1.0.1 | 2025-11-25 | Added to VendHub repository |

---

**Created for:** VendHub Manager Project
**Maintained by:** Development Team
**Total Coverage:** 600+ checkpoints, 80-100h audit time
