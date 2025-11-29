# Quick Project Analysis (30-60 minutes)

## 🎯 Purpose
Fast health check of VendHub project to identify immediate issues and quick wins.

---

## ⚡ Quick Analysis Checklist

### 1. Automated Checks (10 min)

Run these commands and collect results:

```bash
# Backend
cd backend

# Code quality
npm run lint 2>&1 | tee lint-report.txt
npm run type-check 2>&1 | tee type-report.txt

# Security
npm audit --audit-level=moderate 2>&1 | tee audit-report.txt

# Tests
npm run test:cov 2>&1 | tee coverage-report.txt

# Build
npm run build 2>&1 | tee build-report.txt

# Dependencies
npm outdated 2>&1 | tee outdated-report.txt

# Frontend
cd ../frontend
npm run lint 2>&1 | tee lint-report.txt
npm run type-check 2>&1 | tee type-report.txt
npm run build 2>&1 | tee build-report.txt
```

**Report Template**:
```markdown
## Automated Checks Results

### ESLint Issues
- Total warnings: [X]
- Total errors: [X]
- Top 3 issues: [list]

### TypeScript Errors
- Total errors: [X]
- Critical errors: [list]

### Security Vulnerabilities
- Critical: [X]
- High: [X]
- Moderate: [X]
- Packages to update: [list]

### Test Coverage
- Overall: [X]%
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%
- Modules with <50% coverage: [list]

### Build Status
- ✅ Success / ❌ Failed
- Build time: [X]s
- Bundle size: [X] MB
```

---

### 2. Critical Code Patterns Check (10 min)

Search for common issues:

```bash
cd backend/src

# Dangerous patterns
echo "=== Searching for 'any' type usage ==="
grep -r ":\s*any" --include="*.ts" . | wc -l

echo "=== Searching for console.log (should use logger) ==="
grep -r "console\.log" --include="*.ts" modules/ | wc -l

echo "=== Searching for TODO/FIXME ==="
grep -r "TODO\|FIXME" --include="*.ts" modules/ | wc -l

echo "=== Searching for hardcoded secrets patterns ==="
grep -rE "(password|secret|key)\s*=\s*['\"][^'\"]+['\"]" --include="*.ts" . | wc -l

echo "=== Searching for SQL injection risks ==="
grep -r "query.*\${" --include="*.ts" . | wc -l

echo "=== Checking missing photo validation ==="
grep -l "completeTask\|complete.*task" --include="*.service.ts" modules/tasks/ | \
  xargs grep -L "photo.*before\|photo.*after" | wc -l
```

**Report Template**:
```markdown
## Code Pattern Issues

- `any` type usage: [X] instances → Should be < 10
- `console.log` usage: [X] instances → Should use Logger
- TODO/FIXME comments: [X] instances → Track in issues
- Potential hardcoded secrets: [X] instances → CRITICAL if > 0
- SQL injection risks: [X] instances → CRITICAL if > 0
- Missing photo validation: [X] instances → CRITICAL if > 0
```

---

### 3. Database Health Check (10 min)

```bash
# Check migrations
npm run migration:show

# Count entities
find src/modules -name "*.entity.ts" | wc -l

# Check for missing indexes (manual review)
grep -r "@Index" --include="*.entity.ts" src/modules/ | wc -l

# Check for missing foreign keys
grep -r "@ManyToOne\|@OneToMany\|@ManyToMany" --include="*.entity.ts" src/modules/ | \
  wc -l
```

**Manual Checks**:
- [ ] All migrations have been run successfully
- [ ] No pending migrations
- [ ] Foreign keys have proper indexes
- [ ] Entity relationships match ERD (if available)

**Report Template**:
```markdown
## Database Health

- Total entities: [X]
- Total migrations: [X]
- Pending migrations: [X] → Should be 0 in dev
- Indexed relationships: [X]% → Should be > 80%
- Issues found: [list]
```

---

### 4. Security Quick Scan (10 min)

```bash
# Check for exposed secrets in .env files
find . -name ".env" -not -path "*/node_modules/*" -not -name ".env.example"

# Check for hardcoded URLs/IPs
grep -rE "https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" --include="*.ts" src/

# Check authentication guards usage
grep -r "@UseGuards" --include="*.controller.ts" src/modules/ | wc -l
grep -r "@Post\|@Put\|@Patch\|@Delete" --include="*.controller.ts" src/modules/ | wc -l

# Check DTO validation
find src/modules -name "create-*.dto.ts" -o -name "update-*.dto.ts" | \
  xargs grep -L "class-validator" | wc -l
```

**Manual Checks**:
- [ ] All mutating endpoints have guards
- [ ] All DTOs have validation decorators
- [ ] No `.env` files in git (only `.env.example`)
- [ ] Secrets are not hardcoded
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

**Report Template**:
```markdown
## Security Quick Scan

- Protected endpoints: [X]% → Should be 100%
- Validated DTOs: [X]% → Should be 100%
- Exposed .env files: [X] → Should be 0
- Hardcoded secrets: [X] → CRITICAL if > 0
- Hardcoded IPs: [X] → Should use env vars
- Issues: [list]
```

---

### 5. Architecture Compliance (10 min)

**VendHub-Specific Checks**:

```bash
# Check for machine connectivity violations
grep -ri "websocket\|mqtt\|socket\.io\|real.*time.*sync" --include="*.ts" src/modules/machines/

# Check photo validation in tasks
grep -l "completeTask" --include="*.service.ts" src/modules/tasks/ | \
  xargs grep "photo.*before.*\&.*photo.*after"

# Check 3-level inventory implementation
grep -r "warehouse.*inventory\|operator.*inventory\|machine.*inventory" \
  --include="*.entity.ts" src/modules/inventory/

# Check task types
grep -E "(refill|collection|maintenance|inspection|repair|cleaning)" \
  --include="*.entity.ts" src/modules/tasks/
```

**Manual Checks**:
- [ ] No machine connectivity features
- [ ] Photo validation is enforced in task completion
- [ ] 3-level inventory flow is implemented
- [ ] All task types are supported
- [ ] Inventory updates trigger on task completion

**Report Template**:
```markdown
## Architecture Compliance

- ✅/❌ Manual operations architecture (no machine connectivity)
- ✅/❌ Photo validation enforced
- ✅/❌ 3-level inventory implemented
- ✅/❌ Task types complete
- Violations: [list if any]
```

---

### 6. Performance Red Flags (10 min)

```bash
# Find potentially slow queries
grep -r "find({\|findOne({\|findAndCount({" --include="*.service.ts" src/modules/ | \
  grep -v "relations\|select" | wc -l

# Check for missing pagination
grep -r "@Get()" --include="*.controller.ts" src/modules/ | \
  xargs grep -L "take.*skip\|limit.*offset" | wc -l

# Find large file operations
grep -r "readFileSync\|writeFileSync" --include="*.ts" src/ | wc -l

# Check for missing async/await
grep -r "function.*(" --include="*.service.ts" src/modules/ | \
  grep -v "async\|constructor\|private\|protected" | wc -l
```

**Report Template**:
```markdown
## Performance Red Flags

- Queries without select/relations: [X] → Review for optimization
- Endpoints without pagination: [X] → Add pagination
- Sync file operations: [X] → Should use async
- Non-async service methods: [X] → Should use async/await
```

---

## 📊 Quick Analysis Summary Template

```markdown
# VendHub Quick Analysis Report
**Date**: [YYYY-MM-DD]
**Analyst**: [Name]
**Duration**: [X] minutes

---

## 🎯 Overall Health Score: [X]/100

**Scoring**:
- Security: [X]/25
- Code Quality: [X]/25
- Performance: [X]/25
- Architecture: [X]/25

---

## 🔴 Critical Issues (Fix Immediately)

1. **[Issue Title]** - `path/to/file.ts:123`
   - **Impact**: [Security/Data Loss/Performance]
   - **Effort**: [Hours]
   - **Fix**: [Brief description]

2. ...

---

## 🟠 High Priority (Fix This Week)

1. **[Issue Title]**
   - **Impact**: [Description]
   - **Effort**: [Hours/Days]

---

## 🟡 Medium Priority (Fix This Sprint)

1. **[Issue Title]**
2. ...

---

## 🟢 Quick Wins (Easy Improvements)

1. **[Task]** - Effort: 30min
2. **[Task]** - Effort: 1 hour
3. ...

---

## 📈 Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Test Coverage | X% | >70% | ✅/❌ |
| ESLint Errors | X | 0 | ✅/❌ |
| Security Vulns | X | 0 | ✅/❌ |
| TypeScript Errors | X | 0 | ✅/❌ |
| `any` Usage | X | <10 | ✅/❌ |

---

## ✅ Next Actions

1. [ ] Fix critical issues (Owner: [Name], Due: [Date])
2. [ ] Create GitHub issues for high-priority items
3. [ ] Schedule deep-dive analysis for [Module Name]
4. [ ] Update documentation based on findings
5. [ ] Schedule follow-up review in [X] weeks

---

## 📝 Notes

[Any additional context, observations, or recommendations]

---

**Next Review**: [YYYY-MM-DD]
```

---

## 🚀 Running the Quick Analysis

### Full Command Sequence

```bash
#!/bin/bash
# quick-analysis.sh

echo "🚀 Starting VendHub Quick Analysis..."
echo "======================================"

# Create reports directory
mkdir -p analysis-reports
REPORT_DIR="analysis-reports/$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

cd backend

echo "1/6 Running automated checks..."
{
  echo "=== LINT ==="
  npm run lint
  echo -e "\n=== TYPE CHECK ==="
  npm run type-check
  echo -e "\n=== TESTS ==="
  npm run test:cov
  echo -e "\n=== SECURITY AUDIT ==="
  npm audit --audit-level=moderate
  echo -e "\n=== BUILD ==="
  npm run build
} > "$REPORT_DIR/automated-checks.txt" 2>&1

echo "2/6 Checking code patterns..."
{
  echo "=== ANY TYPE USAGE ==="
  grep -r ":\s*any" --include="*.ts" src/ || echo "None found"
  echo -e "\n=== CONSOLE.LOG ==="
  grep -r "console\.log" --include="*.ts" src/modules/ || echo "None found"
  echo -e "\n=== TODO/FIXME ==="
  grep -r "TODO\|FIXME" --include="*.ts" src/modules/ || echo "None found"
} > "$REPORT_DIR/code-patterns.txt" 2>&1

echo "3/6 Checking database..."
{
  npm run migration:show
  echo -e "\n=== ENTITY COUNT ==="
  find src/modules -name "*.entity.ts" | wc -l
} > "$REPORT_DIR/database.txt" 2>&1

echo "4/6 Security scan..."
{
  echo "=== ENV FILES ==="
  find . -name ".env" -not -path "*/node_modules/*" -not -name ".env.example"
  echo -e "\n=== GUARDS USAGE ==="
  echo "Controllers with guards: $(grep -r "@UseGuards" --include="*.controller.ts" src/modules/ | wc -l)"
  echo "Mutating endpoints: $(grep -r "@Post\|@Put\|@Patch\|@Delete" --include="*.controller.ts" src/modules/ | wc -l)"
} > "$REPORT_DIR/security.txt" 2>&1

echo "5/6 Architecture compliance..."
{
  echo "=== MACHINE CONNECTIVITY CHECK ==="
  grep -ri "websocket\|mqtt\|socket\.io" --include="*.ts" src/modules/machines/ || echo "✅ No connectivity code found"
  echo -e "\n=== PHOTO VALIDATION ==="
  grep -l "completeTask" --include="*.service.ts" src/modules/tasks/ | xargs grep "photo" || echo "⚠️ Check manually"
} > "$REPORT_DIR/architecture.txt" 2>&1

echo "6/6 Performance check..."
{
  echo "=== SYNC FILE OPS ==="
  grep -r "readFileSync\|writeFileSync" --include="*.ts" src/ | wc -l
  echo -e "\n=== PAGINATION ==="
  echo "Endpoints: $(grep -r "@Get()" --include="*.controller.ts" src/modules/ | wc -l)"
  echo "With pagination: $(grep -r "take.*skip\|limit.*offset" --include="*.controller.ts" src/modules/ | wc -l)"
} > "$REPORT_DIR/performance.txt" 2>&1

cd ..

echo "======================================"
echo "✅ Quick analysis complete!"
echo "📁 Reports saved to: $REPORT_DIR"
echo ""
echo "Next steps:"
echo "1. Review reports in $REPORT_DIR"
echo "2. Fill out the summary template above"
echo "3. Create GitHub issues for critical items"
echo "4. Schedule follow-up if needed"
```

**Make it executable**:
```bash
chmod +x quick-analysis.sh
./quick-analysis.sh
```

---

## 💡 Tips

1. **Run regularly**: Schedule weekly or before each deployment
2. **Track trends**: Compare reports over time
3. **Automate**: Add to CI/CD pipeline
4. **Follow up**: Don't just analyze - fix issues!
5. **Share results**: Post in team chat or standup

---

**Time Budget**:
- Automated checks: 10 min
- Code patterns: 10 min
- Database: 10 min
- Security: 10 min
- Architecture: 10 min
- Performance: 10 min
- **Total**: 60 minutes max

**Quick version** (30 min): Skip performance and focus on critical security + architecture.
