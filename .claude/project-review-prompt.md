# 🔍 VendHub Project Review Prompt

> **Purpose**: Comprehensive project review checklist for AI assistants and developers
> **Version**: 1.0.0
> **Last Updated**: 2025-11-21

This prompt is designed for systematic review of the VendHub project to ensure code quality, architectural compliance, security, and adherence to project standards.

---

## 📋 How to Use This Prompt

### For AI Assistants (Claude Code, etc.)
```
Review the VendHub project comprehensively according to .claude/project-review-prompt.md
Focus on: [specific area - architecture/security/code-quality/all]
Scope: [full-project/backend/frontend/specific-module]
```

### For Developers
Use this as a checklist before:
- Major releases
- Code reviews
- Merging large features
- Onboarding new team members
- Architecture reviews

---

## 🎯 Review Areas

## 1. 🏗️ Architecture Compliance

### Critical Architecture Principles
- [ ] **Manual Operations Architecture**
  - No direct machine connectivity implemented
  - No automated status updates from machines
  - No real-time data sync features
  - All data flows through operator actions

- [ ] **Photo Validation**
  - All task completions require photo validation
  - Photos validated before AND after task completion
  - No bypass mechanisms for photo requirements
  - Photo validation in refill, collection, maintenance tasks

- [ ] **3-Level Inventory System**
  - Warehouse → Operator → Machine flow maintained
  - Inventory updates on task creation (Warehouse → Operator)
  - Inventory updates on task completion (Operator → Machine)
  - No direct Warehouse → Machine transfers

- [ ] **Task-Centric Operations**
  - All operations flow through tasks
  - Task types properly defined (refill, collection, maintenance, etc.)
  - Task status transitions validated
  - Task assignments and permissions enforced

### Review Commands
```bash
# Search for connectivity-related code (should be none)
grep -r "mqtt\|websocket\|socket.io\|machine.*api\|device.*connect" backend/src/

# Check photo validation in task services
grep -r "task.*complete\|completeTask" backend/src/modules/tasks/

# Verify inventory update logic
grep -r "updateInventory\|transfer.*inventory" backend/src/modules/inventory/
```

---

## 2. 📝 Code Quality & Conventions

### File & Naming Conventions
- [ ] Backend files use kebab-case (`user.service.ts`, `task.controller.ts`)
- [ ] Classes use PascalCase (`UserService`, `TaskController`)
- [ ] Methods use camelCase (`createTask`, `getUserById`)
- [ ] Constants use UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- [ ] Frontend components use PascalCase files (`TaskList.tsx`)
- [ ] Hooks/utilities use camelCase (`useAuth.ts`, `formatDate.ts`)

### Code Structure
- [ ] All entities extend `BaseEntity`
- [ ] All DTOs have proper validation decorators
- [ ] All services have JSDoc comments on public methods
- [ ] All controllers have Swagger/OpenAPI decorators
- [ ] Path aliases used correctly (`@/`, `@modules/`, `@config/`)

### Review Commands
```bash
# Check for naming convention violations
find backend/src -name "*Service.ts" -o -name "*Controller.ts"
find backend/src/modules -type f -name "*.ts" | grep -v "[a-z-]*.ts$"

# Check for missing validation
grep -L "class-validator" backend/src/modules/*/dto/*.dto.ts

# Check for any types
grep -r ": any\|<any>" backend/src/modules/ | grep -v ".spec.ts"
```

---

## 3. 🗄️ Database & TypeORM

### Entity Standards
- [ ] All entities extend `BaseEntity` (provides id, timestamps, soft delete)
- [ ] Column names use snake_case (PostgreSQL convention)
- [ ] Indexes added to foreign keys
- [ ] Indexes added to frequently queried fields
- [ ] Enums used for status/type fields
- [ ] JSONB used appropriately for flexible metadata
- [ ] Relationships properly defined with `@JoinColumn`

### Migrations
- [ ] All schema changes have migrations
- [ ] Migration files follow naming convention
- [ ] Migrations are reversible (have up/down)
- [ ] No manual schema changes without migrations
- [ ] Migration names are descriptive

### Review Commands
```bash
# Find entities not extending BaseEntity
grep -L "extends BaseEntity" backend/src/modules/*/entities/*.entity.ts

# Check for camelCase in column definitions (should be snake_case)
grep "@Column" backend/src/modules/*/entities/*.entity.ts | grep -i "[a-z][A-Z]"

# List all migrations
ls -la backend/src/database/migrations/

# Check for missing indexes on foreign keys
grep -A 5 "foreign.*key\|@ManyToOne\|@OneToMany" backend/src/modules/*/entities/*.entity.ts
```

---

## 4. 🧪 Testing Coverage

### Test Requirements
- [ ] Unit tests exist for all services
- [ ] Minimum 70% code coverage achieved
- [ ] All API endpoints have tests
- [ ] Critical user flows have E2E tests
- [ ] Tests follow naming convention (`*.spec.ts`, `*.test.ts`)

### Test Quality
- [ ] Tests have descriptive names
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Mocks used appropriately
- [ ] No hardcoded test data (use factories)
- [ ] Tests are independent (no test interdependencies)

### Review Commands
```bash
# Run tests with coverage
cd backend && npm run test:cov

# Find services without tests
for file in backend/src/modules/*/services/*.service.ts; do
  test_file="${file%.ts}.spec.ts"
  [ ! -f "$test_file" ] && echo "Missing test: $test_file"
done

# Check test quality
grep -r "it('test'" backend/src/ # Generic test names (bad)
grep -r "describe\|it" backend/src/**/*.spec.ts | wc -l # Count tests
```

---

## 5. 🔒 Security Review

### Authentication & Authorization
- [ ] All protected routes use `@UseGuards(JwtAuthGuard)`
- [ ] Role-based access control implemented with `@Roles()` decorator
- [ ] JWT tokens have expiration
- [ ] Refresh tokens implemented
- [ ] Password hashing uses bcrypt
- [ ] No credentials in code

### Input Validation
- [ ] All DTOs have validation decorators
- [ ] File uploads validate type and size
- [ ] SQL injection prevention (no raw queries with user input)
- [ ] XSS prevention (input sanitization)
- [ ] Rate limiting configured

### Secrets Management
- [ ] No hardcoded secrets in code
- [ ] All secrets in `.env` file
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` provided with dummy values

### Review Commands
```bash
# Check for hardcoded secrets
grep -r "password.*=\|secret.*=\|key.*=" backend/src/ --include="*.ts" | grep -v ".env\|.example"

# Find unprotected routes
grep -r "@Post\|@Get\|@Put\|@Patch\|@Delete" backend/src/modules/*/controllers/ | grep -v "@UseGuards"

# Check for raw SQL queries
grep -r "\.query(" backend/src/

# Find any types (potential security risk)
grep -r ": any" backend/src/modules/ | grep -v ".spec.ts"
```

---

## 6. 📚 Documentation

### Code Documentation
- [ ] All public methods have JSDoc comments
- [ ] Complex logic has inline comments
- [ ] Swagger/OpenAPI decorators on all endpoints
- [ ] DTOs have `@ApiProperty` decorators
- [ ] README files exist for major modules

### API Documentation
- [ ] Swagger UI accessible at `/api/docs`
- [ ] All endpoints documented
- [ ] Request/response examples provided
- [ ] Authentication documented

### Project Documentation
- [ ] `CLAUDE.md` up to date
- [ ] `.claude/rules.md` reflects current architecture
- [ ] `README.md` has setup instructions
- [ ] Module-specific README files exist

### Review Commands
```bash
# Find methods without JSDoc
grep -B 5 "async [a-zA-Z]" backend/src/modules/*/services/*.service.ts | grep -v "\/\*\*"

# Check Swagger decorators
grep -L "@ApiTags\|@ApiOperation" backend/src/modules/*/controllers/*.controller.ts

# List documentation files
find . -name "README*.md" -o -name "CLAUDE.md" -o -name "*GUIDE*.md"
```

---

## 7. 🚀 Performance & Optimization

### Database Queries
- [ ] No N+1 query problems
- [ ] Proper use of `relations` in TypeORM
- [ ] Pagination implemented for large datasets
- [ ] Indexes on frequently queried fields

### Code Efficiency
- [ ] No unnecessary database calls in loops
- [ ] Proper use of async/await
- [ ] No blocking operations in request handlers
- [ ] Large operations use queues (BullMQ)

### Caching
- [ ] Redis used for session storage
- [ ] Frequently accessed data cached
- [ ] Cache invalidation strategy in place

### Review Commands
```bash
# Find potential N+1 queries
grep -r "\.find\|\.findOne" backend/src/modules/ | grep -v "relations:"

# Check for database calls in loops
grep -B 10 "for.*of\|forEach" backend/src/modules/*/services/*.service.ts | grep "await.*find"

# Look for missing pagination
grep -r "\.find(" backend/src/modules/*/services/ | grep -v "take:\|skip:"
```

---

## 8. 🏗️ Module Structure

### Standard Module Structure
- [ ] Each module has proper directory structure:
  - `dto/` - Data Transfer Objects
  - `entities/` - TypeORM entities
  - `services/` - Business logic
  - `controllers/` - API endpoints
  - `guards/` - Custom guards (if needed)
  - `decorators/` - Custom decorators (if needed)

### Module Organization
- [ ] Module follows single responsibility principle
- [ ] Related functionality grouped together
- [ ] No circular dependencies
- [ ] Proper dependency injection

### Review Commands
```bash
# Check module structure
for module in backend/src/modules/*; do
  echo "Checking $module"
  [ ! -d "$module/dto" ] && echo "  Missing dto/"
  [ ! -d "$module/entities" ] && echo "  Missing entities/"
  [ ! -f "$module/*.service.ts" ] && echo "  Missing service"
  [ ! -f "$module/*.controller.ts" ] && echo "  Missing controller"
done

# Check for circular dependencies
npm run build 2>&1 | grep -i "circular"
```

---

## 9. 🔄 Git & Version Control

### Commit Standards
- [ ] Commits follow conventional commits format
- [ ] Commit messages are descriptive
- [ ] No large binary files in git
- [ ] No sensitive data in commit history
- [ ] `.gitignore` properly configured

### Branch Strategy
- [ ] Feature branches follow naming convention
- [ ] No direct commits to main/master
- [ ] Pull requests used for all changes
- [ ] Branch names descriptive (`feature/`, `fix/`, `docs/`)

### Review Commands
```bash
# Check recent commits format
git log --oneline -20

# Check for large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort --numeric-sort --key=2 | tail -20

# Check for secrets in history
git log -p | grep -i "password\|secret\|key" | grep -v "password_hash\|secret_key"

# List current branches
git branch -a
```

---

## 10. 🌍 Environment & Configuration

### Environment Variables
- [ ] All required variables in `.env.example`
- [ ] No default sensitive values
- [ ] Environment validation implemented
- [ ] Different configs for dev/staging/prod

### Configuration Files
- [ ] TypeScript configuration proper
- [ ] ESLint/Prettier configured
- [ ] Docker configurations valid
- [ ] Package.json scripts documented

### Review Commands
```bash
# Compare .env files
diff backend/.env.example backend/.env | grep "^<" # Variables in example but not in .env

# Check environment validation
cat backend/src/config/env.validation.ts

# Validate JSON files
find . -name "*.json" -exec sh -c 'echo "Checking {}"; jq empty {} 2>&1' \;
```

---

## 11. 🐛 Common Pitfalls Check

### Critical Mistakes to Avoid
- [ ] No machine connectivity features implemented
- [ ] No task completion without photo validation
- [ ] No inventory updates missing after task completion
- [ ] No raw SQL queries with user input
- [ ] No `any` types in production code
- [ ] No over-engineered abstractions
- [ ] No missing error handling

### Review Commands
```bash
# Check for machine connectivity code
grep -r "mqtt\|websocket\|socket\.io\|device.*api\|machine.*connect\|ping.*machine" backend/src/

# Check task completion without photo validation
grep -A 20 "completeTask\|complete.*task" backend/src/modules/tasks/ | grep -v "photo\|image"

# Check for any types
grep -r ": any" backend/src/modules/ | grep -v ".spec.ts" | grep -v "node_modules"

# Check for raw SQL
grep -r "\.query(" backend/src/ | grep -v ".spec.ts"
```

---

## 12. 📦 Dependencies

### Package Management
- [ ] No unused dependencies
- [ ] No vulnerable packages
- [ ] Versions properly pinned
- [ ] Lock files committed

### Review Commands
```bash
# Check for vulnerabilities
cd backend && npm audit
cd frontend && npm audit

# Find unused dependencies
cd backend && npx depcheck
cd frontend && npx depcheck

# Check for outdated packages
cd backend && npm outdated
cd frontend && npm outdated
```

---

## 🎯 Automated Review Script

Create a comprehensive review script:

```bash
#!/bin/bash
# .claude/scripts/project-review.sh

echo "🔍 VendHub Project Review"
echo "=========================="

# 1. Architecture Check
echo "\n📐 1. Architecture Compliance"
echo "Checking for machine connectivity code..."
CONNECTIVITY=$(grep -r "mqtt\|websocket\|socket\.io" backend/src/ 2>/dev/null | wc -l)
[ $CONNECTIVITY -eq 0 ] && echo "✅ No connectivity code found" || echo "❌ Found $CONNECTIVITY connectivity references"

echo "Checking photo validation..."
PHOTO_VAL=$(grep -r "completeTask" backend/src/modules/tasks/ 2>/dev/null | grep -c "photo")
echo "✅ Photo validation found in $PHOTO_VAL places"

# 2. Code Quality
echo "\n📝 2. Code Quality"
echo "Checking file naming conventions..."
BAD_NAMES=$(find backend/src -name "*[A-Z]*.ts" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
[ $BAD_NAMES -eq 0 ] && echo "✅ File naming correct" || echo "⚠️  Found $BAD_NAMES files with uppercase"

# 3. Tests
echo "\n🧪 3. Testing"
cd backend
echo "Running tests with coverage..."
npm run test:cov 2>&1 | tail -20

# 4. Security
echo "\n🔒 4. Security"
echo "Checking for hardcoded secrets..."
SECRETS=$(grep -r "password.*=.*['\"].\|secret.*=.*['\"].\|key.*=.*['\"]." backend/src/ 2>/dev/null | grep -v ".env\|.example" | wc -l)
[ $SECRETS -eq 0 ] && echo "✅ No hardcoded secrets" || echo "❌ Found $SECRETS potential secrets"

# 5. Dependencies
echo "\n📦 5. Dependencies"
echo "Checking for vulnerabilities..."
npm audit --audit-level=high 2>&1 | grep -A 5 "vulnerabilities"

# 6. Build
echo "\n🏗️ 6. Build Check"
echo "Building backend..."
npm run build 2>&1 | tail -5

cd ../frontend
echo "Building frontend..."
npm run build 2>&1 | tail -5

echo "\n✅ Review Complete!"
```

---

## 📊 Review Report Template

After review, document findings:

```markdown
# VendHub Project Review Report

**Date**: YYYY-MM-DD
**Reviewer**: [Name/AI Assistant]
**Scope**: [Full Project/Specific Module]

## Summary
- **Overall Status**: 🟢 Good / 🟡 Needs Attention / 🔴 Critical Issues
- **Critical Issues**: X
- **Warnings**: Y
- **Recommendations**: Z

## Findings by Category

### 1. Architecture Compliance
- Status: 🟢/🟡/🔴
- Issues Found:
  - [Issue description]
- Recommendations:
  - [Recommendation]

### 2. Code Quality
- Status: 🟢/🟡/🔴
- Issues Found:
  - [Issue description]
- Recommendations:
  - [Recommendation]

### 3. Testing Coverage
- Status: 🟢/🟡/🔴
- Current Coverage: XX%
- Missing Tests:
  - [Module/feature]

### 4. Security
- Status: 🟢/🟡/🔴
- Vulnerabilities: X critical, Y high, Z medium
- Issues Found:
  - [Issue description]

### 5. Documentation
- Status: 🟢/🟡/🔴
- Missing Documentation:
  - [What's missing]

## Action Items

### Critical (Do Immediately)
1. [Action item with owner]

### High Priority (This Sprint)
1. [Action item with owner]

### Medium Priority (Next Sprint)
1. [Action item with owner]

### Low Priority (Backlog)
1. [Action item]

## Positive Highlights
- [What's working well]

## Next Review Date
[Date]
```

---

## 🚀 Quick Review Commands

### Fast Health Check (5 minutes)
```bash
# Architecture
grep -r "mqtt\|websocket" backend/src/ | wc -l

# Code quality
find backend/src -name "*[A-Z]*.ts" | wc -l

# Tests
cd backend && npm run test 2>&1 | tail -5

# Security
grep -r "password.*=" backend/src/ | grep -v ".env"

# Build
cd backend && npm run build
```

### Medium Review (30 minutes)
```bash
# Run all tests with coverage
cd backend && npm run test:cov

# Check for security vulnerabilities
npm audit

# Lint check
npm run lint

# Type check
npm run type-check

# Build check
npm run build
```

### Full Review (2-4 hours)
```bash
# Run automated script
./.claude/scripts/project-review.sh

# Manual code review of critical modules
# - backend/src/modules/tasks/
# - backend/src/modules/inventory/
# - backend/src/modules/auth/

# Database review
# - Check migrations
# - Review entity relationships
# - Check indexes

# Security audit
# - Dependency vulnerabilities
# - Code scanning
# - Secret detection

# Documentation review
# - Update CLAUDE.md
# - Update API docs
# - Update README
```

---

## 📝 Usage Examples

### Example 1: Pre-Release Review
```
AI Assistant: Review the VendHub project comprehensively according to
.claude/project-review-prompt.md. This is a pre-release review for v1.0.0.
Focus on: all areas
Scope: full project
Generate a detailed report using the report template.
```

### Example 2: Security-Focused Review
```
AI Assistant: Review the VendHub project according to
.claude/project-review-prompt.md.
Focus on: security only
Scope: backend authentication and authorization modules
Check for: hardcoded secrets, SQL injection, XSS vulnerabilities,
missing guards, weak validation.
```

### Example 3: New Module Review
```
AI Assistant: Review the new Equipment module according to
.claude/project-review-prompt.md.
Scope: backend/src/modules/equipment/
Check: code quality, testing, documentation, security, architecture compliance
```

### Example 4: Performance Review
```
AI Assistant: Review the VendHub project according to
.claude/project-review-prompt.md.
Focus on: performance and optimization
Check for: N+1 queries, missing indexes, unoptimized queries,
missing pagination, blocking operations
```

---

## 🎓 Review Best Practices

### For AI Assistants
1. **Be Thorough**: Don't skip sections
2. **Provide Context**: Explain WHY something is an issue
3. **Prioritize**: Mark critical vs. minor issues
4. **Give Examples**: Show correct vs. incorrect code
5. **Be Actionable**: Provide clear next steps

### For Human Reviewers
1. **Schedule Regular Reviews**: Weekly/monthly depending on activity
2. **Track Progress**: Keep review reports in git
3. **Follow Up**: Ensure action items are completed
4. **Learn Patterns**: Build a library of common issues
5. **Automate**: Use scripts for repetitive checks

---

## 🔄 Continuous Improvement

### Update This Document
- After finding new common issues
- When architecture evolves
- When new tools/practices adopted
- Based on team feedback

### Automate More
- Add to CI/CD pipeline
- Create pre-commit hooks
- Set up automated security scanning
- Integrate with code review tools

---

## ✅ Review Checklist Summary

Before marking review as complete, ensure:

- [ ] All 12 review areas covered
- [ ] Critical issues documented
- [ ] Action items created with owners
- [ ] Report generated using template
- [ ] Next review date scheduled
- [ ] Team notified of findings
- [ ] High priority items added to sprint

---

**Remember**: The goal is continuous improvement, not perfection. Use this prompt to systematically identify areas for enhancement while maintaining VendHub's core architectural principles.

**Key Principles to Verify**:
- ✅ Manual Operations (no machine connectivity)
- ✅ Photo Validation (mandatory for tasks)
- ✅ 3-Level Inventory (proper flow)
- ✅ Task-Centric Operations (all flows through tasks)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-21
**Maintained By**: VendHub Development Team
**For**: Comprehensive project quality assurance
