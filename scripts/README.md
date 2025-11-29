# VendHub Scripts

Automation scripts for development, analysis, and deployment tasks.

## 📋 Available Scripts

### `quick-analysis.sh` - Quick Project Health Check

Automated script to analyze project health and identify issues.

**Usage**:
```bash
# Quick analysis (30-45 min)
./scripts/quick-analysis.sh

# Full analysis (60 min)
./scripts/quick-analysis.sh --full
```

**What it checks**:
- ✅ Code quality (ESLint, TypeScript)
- ✅ Test coverage
- ✅ Security vulnerabilities
- ✅ Code patterns (`any` usage, console.log, etc.)
- ✅ Database migrations
- ✅ Security (guards, validation, secrets)
- ✅ Architecture compliance (VendHub-specific)
- ⚡ Performance (only with `--full`)

**Output**:
- Report directory: `analysis-reports/YYYYMMDD-HHMMSS/`
- Summary: `SUMMARY.md` with health score
- Detailed logs for each check

**Example output**:
```
🚀 VendHub Quick Analysis
======================================
Mode: QUICK
Time: 2025-11-17 14:30:00
======================================

[1/6] Running automated checks...
  → ESLint... ✓
  → TypeScript... ✓
  → Tests... ✓ (Coverage: 74.5%)
  → Security audit... ✓
  → Build... ✓
[2/6] Checking code patterns...
  → 'any' type usage... 8
  → console.log usage... 3
  → TODO/FIXME... 12
  → Hardcoded secrets... 0
...

======================================
📊 Analysis Summary
======================================
Critical issues: 0
High priority: 2
Medium priority: 5

Total issues: 7

Health Score: 85/100
Status: GOOD ✓
```

---

## 🔧 Future Scripts (Planned)

### `setup-dev.sh`
- One-command development environment setup
- Install dependencies, start Docker, run migrations

### `deploy-staging.sh`
- Deploy to staging environment
- Run pre-deployment checks

### `backup-db.sh`
- Backup PostgreSQL database
- Upload to S3/R2

### `generate-module.sh`
- Scaffold new NestJS module
- Generate entity, service, controller, DTOs, tests

---

## 📝 Script Development Guidelines

When creating new scripts:

1. **Use bash shebang**: `#!/bin/bash`
2. **Set error handling**: `set -e` (exit on error)
3. **Add colors**: Use ANSI codes for readability
4. **Document usage**: Add header comment with usage examples
5. **Make executable**: `chmod +x scripts/your-script.sh`
6. **Add to this README**: Document what it does

**Template**:
```bash
#!/bin/bash
# Script Name: your-script.sh
# Description: What this script does
# Usage: ./scripts/your-script.sh [options]
# Example: ./scripts/your-script.sh --verbose

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Your script here
echo -e "${GREEN}✓ Success${NC}"
```

---

## 🚀 Usage Examples

### Run quick analysis before commit
```bash
./scripts/quick-analysis.sh
# Review output
# Fix critical issues
git commit -m "fix: critical security issues"
```

### Weekly health check
```bash
# Every Monday morning
./scripts/quick-analysis.sh --full > weekly-report.txt
# Share in team chat
```

### Pre-deployment check
```bash
# Before deploying to production
./scripts/quick-analysis.sh --full
# Ensure health score > 90
# Fix critical/high issues
```

### CI/CD integration
```yaml
# .github/workflows/analysis.yml
- name: Run project analysis
  run: ./scripts/quick-analysis.sh

- name: Upload reports
  uses: actions/upload-artifact@v3
  with:
    name: analysis-reports
    path: analysis-reports/
```

---

## 📊 Health Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | Deploy with confidence |
| 80-89 | 🟢 Good | Minor improvements recommended |
| 70-79 | 🟡 Fair | Address high-priority issues |
| 60-69 | 🟠 Poor | Do not deploy, fix issues |
| 0-59 | 🔴 Critical | Major work needed |

**Score calculation**:
```
Base: 100
- Critical issues: -20 each
- High priority: -10 each
- Medium priority: -5 each
Minimum: 0
```

---

## 🔍 Troubleshooting

### Script fails with "command not found"
```bash
# Make sure you're in project root
cd /path/to/VendHub

# Make script executable
chmod +x scripts/quick-analysis.sh

# Run with bash explicitly
bash scripts/quick-analysis.sh
```

### Permission denied
```bash
chmod +x scripts/*.sh
```

### Missing dependencies
```bash
cd backend
npm install
cd ../frontend
npm install
```

---

## 📚 Related Documentation

- **Analysis prompts**: `.claude/prompts/` - Detailed analysis guides
- **Development rules**: `.claude/rules.md` - Coding standards
- **Testing guide**: `.claude/testing-guide.md` - Test requirements
- **Deployment guide**: `.claude/deployment-guide.md` - Production deployment

---

**Maintained by**: VendHub Development Team
**Last updated**: 2025-11-17
