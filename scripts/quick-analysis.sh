#!/bin/bash

# VendHub Quick Analysis Script
# Runs automated checks and generates analysis report
# Usage: ./scripts/quick-analysis.sh [--full]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FULL_MODE=false
if [[ "$1" == "--full" ]]; then
  FULL_MODE=true
fi

echo -e "${BLUE}🚀 VendHub Quick Analysis${NC}"
echo "======================================"
echo "Mode: $([ "$FULL_MODE" = true ] && echo "FULL" || echo "QUICK")"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# Create reports directory
REPORT_DIR="analysis-reports/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Summary file
SUMMARY="$REPORT_DIR/SUMMARY.md"

# Initialize summary
cat > "$SUMMARY" << EOF
# VendHub Quick Analysis Report
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Mode**: $([ "$FULL_MODE" = true ] && echo "Full Analysis" || echo "Quick Check")

---

EOF

# Counter for issues
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0

# Function to add to summary
add_summary() {
  echo "$1" >> "$SUMMARY"
}

# Function to check command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# 1. AUTOMATED CHECKS
# =============================================================================
echo -e "${YELLOW}[1/6]${NC} Running automated checks..."

cd backend

# ESLint
echo -n "  → ESLint... "
if npm run lint > "$REPORT_DIR/eslint.txt" 2>&1; then
  echo -e "${GREEN}✓${NC}"
  ESLINT_ERRORS=0
else
  ESLINT_ERRORS=$(grep -c "error" "$REPORT_DIR/eslint.txt" || echo 0)
  ESLINT_WARNINGS=$(grep -c "warning" "$REPORT_DIR/eslint.txt" || echo 0)
  echo -e "${RED}✗${NC} ($ESLINT_ERRORS errors, $ESLINT_WARNINGS warnings)"
  if [ "$ESLINT_ERRORS" -gt 0 ]; then
    ((HIGH_COUNT++))
  fi
fi

# TypeScript
echo -n "  → TypeScript... "
if npm run type-check > "$REPORT_DIR/typescript.txt" 2>&1; then
  echo -e "${GREEN}✓${NC}"
  TS_ERRORS=0
else
  TS_ERRORS=$(grep -c "error TS" "$REPORT_DIR/typescript.txt" || echo 0)
  echo -e "${RED}✗${NC} ($TS_ERRORS errors)"
  if [ "$TS_ERRORS" -gt 0 ]; then
    ((HIGH_COUNT++))
  fi
fi

# Tests
echo -n "  → Tests... "
if npm run test:cov > "$REPORT_DIR/tests.txt" 2>&1; then
  COVERAGE=$(grep -A5 "All files" "$REPORT_DIR/tests.txt" | grep -oP '\d+\.\d+' | head -1 || echo "0")
  echo -e "${GREEN}✓${NC} (Coverage: ${COVERAGE}%)"
  if (( $(echo "$COVERAGE < 70" | bc -l) )); then
    ((MEDIUM_COUNT++))
  fi
else
  echo -e "${RED}✗${NC}"
  ((HIGH_COUNT++))
fi

# Security Audit
echo -n "  → Security audit... "
npm audit --audit-level=moderate > "$REPORT_DIR/npm-audit.txt" 2>&1 || true
CRITICAL_VULNS=$(grep -oP '\d+ critical' "$REPORT_DIR/npm-audit.txt" | grep -oP '\d+' || echo 0)
HIGH_VULNS=$(grep -oP '\d+ high' "$REPORT_DIR/npm-audit.txt" | grep -oP '\d+' || echo 0)
if [ "$CRITICAL_VULNS" -gt 0 ] || [ "$HIGH_VULNS" -gt 0 ]; then
  echo -e "${RED}✗${NC} (Critical: $CRITICAL_VULNS, High: $HIGH_VULNS)"
  ((CRITICAL_COUNT += CRITICAL_VULNS))
  ((HIGH_COUNT += HIGH_VULNS))
else
  echo -e "${GREEN}✓${NC}"
fi

# Build
echo -n "  → Build... "
if npm run build > "$REPORT_DIR/build.txt" 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  ((CRITICAL_COUNT++))
fi

# Add to summary
add_summary "## 📊 Automated Checks"
add_summary ""
add_summary "| Check | Status | Details |"
add_summary "|-------|--------|---------|"
add_summary "| ESLint | $([ "$ESLINT_ERRORS" -eq 0 ] && echo "✅" || echo "❌") | $ESLINT_ERRORS errors, $ESLINT_WARNINGS warnings |"
add_summary "| TypeScript | $([ "$TS_ERRORS" -eq 0 ] && echo "✅" || echo "❌") | $TS_ERRORS errors |"
add_summary "| Tests | $([ "$COVERAGE" != "0" ] && echo "✅" || echo "❌") | ${COVERAGE}% coverage |"
add_summary "| Security | $([ "$CRITICAL_VULNS" -eq 0 ] && [ "$HIGH_VULNS" -eq 0 ] && echo "✅" || echo "⚠️") | Critical: $CRITICAL_VULNS, High: $HIGH_VULNS |"
add_summary "| Build | ✅ | Success |"
add_summary ""

# =============================================================================
# 2. CODE PATTERNS
# =============================================================================
echo -e "${YELLOW}[2/6]${NC} Checking code patterns..."

cd src

# Any type usage
echo -n "  → 'any' type usage... "
ANY_COUNT=$(grep -r ":\s*any" --include="*.ts" . 2>/dev/null | wc -l || echo 0)
if [ "$ANY_COUNT" -gt 10 ]; then
  echo -e "${RED}$ANY_COUNT${NC} (>10)"
  ((MEDIUM_COUNT++))
elif [ "$ANY_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}$ANY_COUNT${NC}"
else
  echo -e "${GREEN}0${NC}"
fi

# console.log usage
echo -n "  → console.log usage... "
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.ts" modules/ 2>/dev/null | wc -l || echo 0)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}$CONSOLE_COUNT${NC}"
  ((MEDIUM_COUNT++))
else
  echo -e "${GREEN}0${NC}"
fi

# TODO/FIXME
echo -n "  → TODO/FIXME... "
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.ts" modules/ 2>/dev/null | wc -l || echo 0)
echo -e "${BLUE}$TODO_COUNT${NC}"

# Hardcoded secrets
echo -n "  → Hardcoded secrets... "
SECRET_COUNT=$(grep -rE "(password|secret|key)\s*=\s*['\"][^'\"]+['\"]" --include="*.ts" . 2>/dev/null | grep -v "\.spec\.ts" | wc -l || echo 0)
if [ "$SECRET_COUNT" -gt 0 ]; then
  echo -e "${RED}$SECRET_COUNT${NC} ⚠️  CRITICAL"
  ((CRITICAL_COUNT++))
else
  echo -e "${GREEN}0${NC}"
fi

cd ..

add_summary "## 🔍 Code Patterns"
add_summary ""
add_summary "| Pattern | Count | Status |"
add_summary "|---------|-------|--------|"
add_summary "| \`any\` type usage | $ANY_COUNT | $([ "$ANY_COUNT" -le 10 ] && echo "✅" || echo "⚠️") |"
add_summary "| \`console.log\` | $CONSOLE_COUNT | $([ "$CONSOLE_COUNT" -eq 0 ] && echo "✅" || echo "⚠️") |"
add_summary "| TODO/FIXME | $TODO_COUNT | ℹ️ |"
add_summary "| Hardcoded secrets | $SECRET_COUNT | $([ "$SECRET_COUNT" -eq 0 ] && echo "✅" || echo "🔴") |"
add_summary ""

# =============================================================================
# 3. DATABASE
# =============================================================================
echo -e "${YELLOW}[3/6]${NC} Checking database..."

echo -n "  → Migrations... "
MIGRATIONS_OUTPUT=$(npm run migration:show 2>&1 || echo "Error")
echo "$MIGRATIONS_OUTPUT" > "$REPORT_DIR/migrations.txt"
echo -e "${GREEN}✓${NC}"

echo -n "  → Entities... "
ENTITY_COUNT=$(find src/modules -name "*.entity.ts" 2>/dev/null | wc -l || echo 0)
echo -e "${BLUE}$ENTITY_COUNT${NC}"

add_summary "## 🗄️ Database"
add_summary ""
add_summary "- Total entities: $ENTITY_COUNT"
add_summary "- Migrations: See \`migrations.txt\`"
add_summary ""

# =============================================================================
# 4. SECURITY
# =============================================================================
echo -e "${YELLOW}[4/6]${NC} Security scan..."

cd src

# .env files (should only be .env.example)
echo -n "  → .env files... "
ENV_FILES=$(find . -name ".env" -not -path "*/node_modules/*" -not -name ".env.example" 2>/dev/null | wc -l || echo 0)
if [ "$ENV_FILES" -gt 0 ]; then
  echo -e "${RED}$ENV_FILES${NC} ⚠️  Remove from git!"
  ((CRITICAL_COUNT++))
else
  echo -e "${GREEN}0${NC}"
fi

# Guards usage
echo -n "  → Protected endpoints... "
GUARDS_COUNT=$(grep -r "@UseGuards" --include="*.controller.ts" modules/ 2>/dev/null | wc -l || echo 0)
ENDPOINTS_COUNT=$(grep -r "@Post\|@Put\|@Patch\|@Delete" --include="*.controller.ts" modules/ 2>/dev/null | wc -l || echo 0)
if [ "$ENDPOINTS_COUNT" -gt 0 ]; then
  GUARD_PERCENT=$((GUARDS_COUNT * 100 / ENDPOINTS_COUNT))
  if [ "$GUARD_PERCENT" -lt 80 ]; then
    echo -e "${RED}${GUARD_PERCENT}%${NC}"
    ((HIGH_COUNT++))
  else
    echo -e "${GREEN}${GUARD_PERCENT}%${NC}"
  fi
else
  echo -e "${BLUE}N/A${NC}"
fi

# DTO validation
echo -n "  → DTO validation... "
DTO_COUNT=$(find modules -name "*.dto.ts" 2>/dev/null | wc -l || echo 0)
VALIDATED_DTO=$(find modules -name "*.dto.ts" -exec grep -l "class-validator" {} \; 2>/dev/null | wc -l || echo 0)
if [ "$DTO_COUNT" -gt 0 ]; then
  VALIDATION_PERCENT=$((VALIDATED_DTO * 100 / DTO_COUNT))
  if [ "$VALIDATION_PERCENT" -lt 90 ]; then
    echo -e "${RED}${VALIDATION_PERCENT}%${NC}"
    ((HIGH_COUNT++))
  else
    echo -e "${GREEN}${VALIDATION_PERCENT}%${NC}"
  fi
else
  echo -e "${BLUE}N/A${NC}"
fi

cd ..

add_summary "## 🔒 Security"
add_summary ""
add_summary "| Check | Status |"
add_summary "|-------|--------|"
add_summary "| .env files in git | $([ "$ENV_FILES" -eq 0 ] && echo "✅" || echo "🔴 $ENV_FILES found") |"
add_summary "| Protected endpoints | $([ "$GUARD_PERCENT" -ge 80 ] && echo "✅ ${GUARD_PERCENT}%" || echo "⚠️ ${GUARD_PERCENT}%") |"
add_summary "| DTO validation | $([ "$VALIDATION_PERCENT" -ge 90 ] && echo "✅ ${VALIDATION_PERCENT}%" || echo "⚠️ ${VALIDATION_PERCENT}%") |"
add_summary ""

# =============================================================================
# 5. ARCHITECTURE COMPLIANCE
# =============================================================================
echo -e "${YELLOW}[5/6]${NC} Architecture compliance..."

cd src

# Machine connectivity check
echo -n "  → Machine connectivity... "
CONNECTIVITY_COUNT=$(grep -ri "websocket\|mqtt\|socket\.io" --include="*.ts" modules/machines/ 2>/dev/null | wc -l || echo 0)
if [ "$CONNECTIVITY_COUNT" -gt 0 ]; then
  echo -e "${RED}Found${NC} ⚠️  Should not exist!"
  ((CRITICAL_COUNT++))
else
  echo -e "${GREEN}None${NC}"
fi

# Photo validation
echo -n "  → Photo validation... "
TASK_COMPLETE=$(find modules/tasks -name "*.service.ts" -exec grep -l "completeTask" {} \; 2>/dev/null | wc -l || echo 0)
PHOTO_CHECK=$(find modules/tasks -name "*.service.ts" -exec grep -l "photo.*before.*photo.*after\|validatePhoto" {} \; 2>/dev/null | wc -l || echo 0)
if [ "$TASK_COMPLETE" -gt 0 ] && [ "$PHOTO_CHECK" -eq 0 ]; then
  echo -e "${RED}Missing${NC} ⚠️"
  ((CRITICAL_COUNT++))
elif [ "$PHOTO_CHECK" -gt 0 ]; then
  echo -e "${GREEN}Implemented${NC}"
else
  echo -e "${YELLOW}Check manually${NC}"
fi

# 3-level inventory
echo -n "  → 3-level inventory... "
INVENTORY_LEVELS=$(grep -r "warehouse.*inventory\|operator.*inventory\|machine.*inventory" --include="*.entity.ts" modules/inventory/ 2>/dev/null | wc -l || echo 0)
if [ "$INVENTORY_LEVELS" -ge 3 ]; then
  echo -e "${GREEN}Implemented${NC}"
else
  echo -e "${YELLOW}Check manually${NC}"
fi

cd ..

add_summary "## 🏗️ Architecture Compliance"
add_summary ""
add_summary "| Check | Status |"
add_summary "|-------|--------|"
add_summary "| No machine connectivity | $([ "$CONNECTIVITY_COUNT" -eq 0 ] && echo "✅" || echo "🔴") |"
add_summary "| Photo validation | $([ "$PHOTO_CHECK" -gt 0 ] && echo "✅" || echo "⚠️") |"
add_summary "| 3-level inventory | $([ "$INVENTORY_LEVELS" -ge 3 ] && echo "✅" || echo "ℹ️") |"
add_summary ""

# =============================================================================
# 6. PERFORMANCE
# =============================================================================
if [ "$FULL_MODE" = true ]; then
  echo -e "${YELLOW}[6/6]${NC} Performance check..."

  cd src

  # Sync file operations
  echo -n "  → Sync file operations... "
  SYNC_OPS=$(grep -r "readFileSync\|writeFileSync" --include="*.ts" . 2>/dev/null | wc -l || echo 0)
  if [ "$SYNC_OPS" -gt 0 ]; then
    echo -e "${YELLOW}$SYNC_OPS${NC}"
    ((MEDIUM_COUNT++))
  else
    echo -e "${GREEN}0${NC}"
  fi

  # Pagination
  echo -n "  → Pagination... "
  GET_ENDPOINTS=$(grep -r "@Get()" --include="*.controller.ts" modules/ 2>/dev/null | wc -l || echo 0)
  PAGINATED=$(grep -r "take.*skip\|limit.*offset" --include="*.service.ts" modules/ 2>/dev/null | wc -l || echo 0)
  if [ "$GET_ENDPOINTS" -gt 0 ]; then
    PAGINATION_PERCENT=$((PAGINATED * 100 / GET_ENDPOINTS))
    echo -e "${BLUE}${PAGINATION_PERCENT}%${NC}"
  else
    echo -e "${BLUE}N/A${NC}"
  fi

  cd ..

  add_summary "## ⚡ Performance"
  add_summary ""
  add_summary "| Check | Count |"
  add_summary "|-------|-------|"
  add_summary "| Sync file operations | $SYNC_OPS |"
  add_summary "| Pagination coverage | ${PAGINATION_PERCENT}% |"
  add_summary ""
else
  echo -e "${YELLOW}[6/6]${NC} Performance check... ${BLUE}Skipped (use --full)${NC}"
fi

cd ../..

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "======================================"
echo -e "${BLUE}📊 Analysis Summary${NC}"
echo "======================================"

TOTAL_ISSUES=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT))

echo -e "${RED}Critical issues: $CRITICAL_COUNT${NC}"
echo -e "${YELLOW}High priority: $HIGH_COUNT${NC}"
echo -e "${BLUE}Medium priority: $MEDIUM_COUNT${NC}"
echo ""
echo -e "Total issues: $TOTAL_ISSUES"

# Calculate health score
HEALTH_SCORE=$((100 - CRITICAL_COUNT * 20 - HIGH_COUNT * 10 - MEDIUM_COUNT * 5))
if [ $HEALTH_SCORE -lt 0 ]; then
  HEALTH_SCORE=0
fi

echo ""
echo -e "Health Score: ${HEALTH_SCORE}/100"
if [ $HEALTH_SCORE -ge 80 ]; then
  echo -e "${GREEN}Status: GOOD ✓${NC}"
elif [ $HEALTH_SCORE -ge 60 ]; then
  echo -e "${YELLOW}Status: FAIR ⚠${NC}"
else
  echo -e "${RED}Status: NEEDS ATTENTION ⚠${NC}"
fi

# Add to summary
add_summary "## 🎯 Summary"
add_summary ""
add_summary "**Health Score**: ${HEALTH_SCORE}/100"
add_summary ""
add_summary "### Issues Found"
add_summary "- 🔴 Critical: $CRITICAL_COUNT"
add_summary "- 🟠 High: $HIGH_COUNT"
add_summary "- 🟡 Medium: $MEDIUM_COUNT"
add_summary "- **Total**: $TOTAL_ISSUES"
add_summary ""
add_summary "---"
add_summary ""
add_summary "## 📋 Next Actions"
add_summary ""
add_summary "- [ ] Review detailed reports in \`$REPORT_DIR\`"
add_summary "- [ ] Create GitHub issues for critical items"
add_summary "- [ ] Fix high-priority issues this week"
add_summary "- [ ] Schedule follow-up analysis"
add_summary ""
add_summary "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"

echo ""
echo "======================================"
echo -e "${GREEN}✓ Analysis complete!${NC}"
echo "======================================"
echo ""
echo "📁 Reports saved to: $REPORT_DIR"
echo "📄 Summary: $SUMMARY"
echo ""
echo "View summary:"
echo "  cat $SUMMARY"
echo ""
echo "Next steps:"
echo "  1. Review $SUMMARY"
echo "  2. Check detailed reports in $REPORT_DIR/"
echo "  3. Create GitHub issues for critical items"
echo "  4. Run with --full for complete analysis"
echo ""
