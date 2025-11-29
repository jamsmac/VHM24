#!/bin/bash

# VendHub Quick Review Script
# Fast health check (5 minutes)
# Version: 1.0.1

# Don't exit on errors - we want to collect all issues
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ VendHub Quick Review (Fast Health Check)${NC}"
echo ""

# 1. Architecture - Machine Connectivity Check
echo -ne "📐 Architecture (no connectivity)... "
if [ -d "backend/src" ]; then
    COUNT=$(grep -r "mqtt\|websocket\|socket\.io" backend/src/ 2>/dev/null | grep -v "node_modules" | wc -l)
    [ "$COUNT" -eq 0 ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗ ($COUNT found)${NC}"
else
    echo -e "${YELLOW}?${NC}"
fi

# 2. Code Quality - File Naming
echo -ne "📝 Code quality (naming)... "
if [ -d "backend/src" ]; then
    COUNT=$(find backend/src/modules -name "*[A-Z]*.ts" 2>/dev/null | grep -v "node_modules" | wc -l)
    [ "$COUNT" -eq 0 ] && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ ($COUNT uppercase)${NC}"
else
    echo -e "${YELLOW}?${NC}"
fi

# 3. Security - No hardcoded secrets
echo -ne "🔒 Security (no secrets)... "
if [ -d "backend/src" ]; then
    COUNT=$(grep -r "password\s*=\s*['\"].\|secret\s*=\s*['\"]." backend/src/ 2>/dev/null | grep -v ".env\|.example\|node_modules" | wc -l)
    [ "$COUNT" -eq 0 ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗ ($COUNT found)${NC}"
else
    echo -e "${YELLOW}?${NC}"
fi

# 4. Tests - Existence check
echo -ne "🧪 Tests (exist)... "
if [ -d "backend/src" ]; then
    COUNT=$(find backend/src -name "*.spec.ts" 2>/dev/null | wc -l)
    [ "$COUNT" -gt 0 ] && echo -e "${GREEN}✓ ($COUNT files)${NC}" || echo -e "${RED}✗ (none)${NC}"
else
    echo -e "${YELLOW}?${NC}"
fi

# 5. Build - Quick check
echo -ne "🏗️  Build (compiles)... "
if [ -f "backend/tsconfig.json" ]; then
    cd backend
    if npx tsc --noEmit 2>&1 >/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}?${NC}"
fi

# 6. Dependencies - Critical vulnerabilities
echo -ne "📦 Dependencies (secure)... "
if [ -f "backend/package.json" ]; then
    cd backend
    RESULT=$(npm audit --audit-level=critical 2>&1)
    if echo "$RESULT" | grep -q "found 0 vulnerabilities"; then
        echo -e "${GREEN}✓${NC}"
    else
        COUNT=$(echo "$RESULT" | grep -oP '\d+(?= critical)' | head -1)
        [ -n "$COUNT" ] && echo -e "${RED}✗ ($COUNT critical)${NC}" || echo -e "${YELLOW}⚠${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}?${NC}"
fi

# 7. Documentation
echo -ne "📚 Documentation... "
DOCS=0
[ -f "README.md" ] && ((DOCS++))
[ -f "CLAUDE.md" ] && ((DOCS++))
[ -f ".claude/rules.md" ] && ((DOCS++))
[ "$DOCS" -ge 2 ] && echo -e "${GREEN}✓ ($DOCS files)${NC}" || echo -e "${YELLOW}⚠ ($DOCS files)${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Run ${YELLOW}.claude/scripts/project-review.sh${NC} for detailed review"
echo ""
