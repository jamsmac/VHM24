# 🔧 VendHub Review Scripts

Automated scripts for comprehensive project quality assurance.

---

## 📋 Available Scripts

### 1. **quick-review.sh** ⚡ (5 minutes)

Fast health check for quick validation.

**Usage**:
```bash
./.claude/scripts/quick-review.sh
```

**Checks**:
- ✓ Architecture compliance (no machine connectivity)
- ✓ File naming conventions
- ✓ No hardcoded secrets
- ✓ Tests exist
- ✓ TypeScript compiles
- ✓ No critical vulnerabilities
- ✓ Documentation files exist

**When to use**:
- Before committing code
- Quick daily checks
- CI/CD pre-checks
- After pulling changes

---

### 2. **project-review.sh** 🔍 (15-30 minutes)

Comprehensive project review with detailed analysis.

**Usage**:
```bash
./.claude/scripts/project-review.sh
```

**Checks**:
1. **Architecture Compliance**
   - Machine connectivity violations
   - Photo validation implementation
   - Inventory update logic

2. **Code Quality**
   - Naming conventions
   - Type safety (no `any` types)
   - BaseEntity usage

3. **Security**
   - Hardcoded secrets
   - Unprotected routes
   - Raw SQL queries
   - Authentication guards

4. **Testing**
   - Test file coverage
   - Test execution results

5. **Database & Migrations**
   - Migration files
   - Entity structure

6. **Dependencies**
   - Vulnerability scan
   - Outdated packages

7. **Build**
   - Backend build
   - Frontend build

8. **Documentation**
   - Required files exist
   - API documentation

**Exit Codes**:
- `0` - All checks passed (or warnings only)
- `1` - Critical issues found

**When to use**:
- Before major releases
- Weekly/monthly reviews
- After major refactoring
- Pre-deployment checks
- Architecture audits

---

## 🚀 Quick Start

### Run Quick Check
```bash
cd /path/to/VendHub
./.claude/scripts/quick-review.sh
```

### Run Full Review
```bash
cd /path/to/VendHub
./.claude/scripts/project-review.sh
```

### Run as Part of CI/CD
```yaml
# .github/workflows/quality-check.yml
name: Quality Check

on: [push, pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      - name: Run project review
        run: ./.claude/scripts/project-review.sh
```

---

## 📊 Output Examples

### Quick Review (Success)
```
⚡ VendHub Quick Review (Fast Health Check)

📐 Architecture (no connectivity)... ✓
📝 Code quality (naming)... ✓
🔒 Security (no secrets)... ✓
🧪 Tests (exist)... ✓ (47 files)
🏗️  Build (compiles)... ✓
📦 Dependencies (secure)... ✓
📚 Documentation... ✓ (3 files)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run .claude/scripts/project-review.sh for detailed review
```

### Quick Review (Issues Found)
```
⚡ VendHub Quick Review (Fast Health Check)

📐 Architecture (no connectivity)... ✓
📝 Code quality (naming)... ⚠ (3 uppercase)
🔒 Security (no secrets)... ✗ (2 found)
🧪 Tests (exist)... ✓ (47 files)
🏗️  Build (compiles)... ✗
📦 Dependencies (secure)... ⚠
📚 Documentation... ✓ (3 files)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run .claude/scripts/project-review.sh for detailed review
```

### Full Review (Summary)
```
📊 Summary

✅ Passed checks: 23
⚠️  Warnings: 4
❌ Critical issues: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Overall Status: GOOD (some warnings)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 Best Practices

### For Developers

1. **Run quick-review.sh before every commit**
   ```bash
   # Add to git pre-commit hook
   ./.claude/scripts/quick-review.sh || exit 1
   ```

2. **Run project-review.sh weekly**
   ```bash
   # Schedule in cron or run manually
   ./.claude/scripts/project-review.sh > review-$(date +%Y%m%d).log
   ```

3. **Fix critical issues immediately**
   - Critical issues block releases
   - Security issues have highest priority

4. **Track warnings over time**
   - Warnings should decrease, not increase
   - Set goals (e.g., < 5 warnings)

### For AI Assistants

When asked to review the project:

```
Review VendHub project using .claude/scripts/project-review.sh
Analyze the output and provide:
1. Summary of critical issues
2. Prioritized action items
3. Recommendations for improvements
```

### For CI/CD

```bash
# Run in CI pipeline
if ./.claude/scripts/project-review.sh; then
  echo "✅ Quality checks passed"
else
  echo "❌ Quality checks failed - blocking deployment"
  exit 1
fi
```

---

## 🔧 Customization

### Modify Thresholds

Edit the scripts to adjust thresholds:

```bash
# In project-review.sh

# Example: Change test coverage requirement
if [ "$TEST_COVERAGE" -gt 80 ]; then  # Changed from 70
    print_success "..."
```

### Add Custom Checks

Add your own checks to the scripts:

```bash
# In project-review.sh, add new section:

print_section "🎨 9. Custom Checks"

print_info "Checking custom rule..."
# Your custom logic here
```

### Skip Sections

Comment out sections you don't need:

```bash
# Skip dependency check
# print_section "📦 6. Dependencies"
# ... dependency checks ...
```

---

## 📝 Interpreting Results

### Status Indicators

- **✅ Success** - Check passed, no action needed
- **⚠️  Warning** - Issue found but not critical, should fix
- **❌ Error** - Critical issue, must fix before release

### Overall Status

- **🎉 EXCELLENT** - 0 critical issues, < 5 warnings
- **✓ GOOD** - 0 critical issues, some warnings
- **⚠️  NEEDS ATTENTION** - 1-2 critical issues
- **🚨 CRITICAL** - 3+ critical issues

### Priority Levels

1. **Critical** - Fix immediately (blocks release)
   - Hardcoded secrets
   - Machine connectivity code
   - Missing photo validation
   - Security vulnerabilities

2. **High** - Fix this sprint
   - Missing tests
   - Unprotected routes
   - Build failures

3. **Medium** - Fix next sprint
   - Code style violations
   - Missing documentation
   - Warnings

4. **Low** - Backlog
   - Minor improvements
   - Optimizations

---

## 🐛 Troubleshooting

### Script won't run

```bash
# Make executable
chmod +x ./.claude/scripts/*.sh

# Check bash is available
which bash

# Run with bash explicitly
bash ./.claude/scripts/project-review.sh
```

### False positives

Some checks might flag false positives:

```bash
# Example: websocket in comments
# Add exclusions in script:
grep -r "websocket" backend/src/ | grep -v "comment\|//\|/\*"
```

### Performance issues

For very large codebases:

```bash
# Limit search depth
find backend/src -maxdepth 3 -name "*.ts"

# Use faster grep
export GREP_OPTIONS="--exclude-dir=node_modules --exclude-dir=dist"
```

---

## 📚 Related Documentation

- **[project-review-prompt.md](../project-review-prompt.md)** - Comprehensive review checklist
- **[rules.md](../rules.md)** - Project coding rules
- **[testing-guide.md](../testing-guide.md)** - Testing guidelines
- **[CLAUDE.md](../../CLAUDE.md)** - AI assistant guide

---

## 🔄 Maintenance

### Update Scripts

When project structure changes:
1. Update search paths in scripts
2. Adjust thresholds if needed
3. Add new checks for new features
4. Update this README

### Version History

- **1.0.0** (2025-11-21) - Initial release
  - Quick review script
  - Full project review script
  - Documentation

---

## 💡 Tips

1. **Run quick checks often** - They're fast and catch common issues
2. **Run full reviews regularly** - Weekly or before major milestones
3. **Track metrics over time** - Keep review logs to see trends
4. **Automate in CI/CD** - Catch issues before they reach production
5. **Fix warnings promptly** - Don't let technical debt accumulate

---

## 🤝 Contributing

To improve these scripts:

1. Test your changes thoroughly
2. Update this README
3. Add examples of new checks
4. Document any new thresholds
5. Submit PR with clear description

---

**Maintained By**: VendHub Development Team
**Version**: 1.0.0
**Last Updated**: 2025-11-21
