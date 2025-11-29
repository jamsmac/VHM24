#!/bin/bash

# VendHub Project Review Script
# Automated comprehensive project review
# Version: 1.0.1

# Don't exit on errors - we want to collect all issues
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CRITICAL_ISSUES=0
WARNINGS=0
PASSED=0

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔍 VendHub Project Review Script       ║${NC}"
echo -e "${BLUE}║   Comprehensive Quality Check             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Started at: $(date)"
echo ""

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((CRITICAL_ISSUES++))
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================
# 1. ARCHITECTURE COMPLIANCE
# ============================================================
print_section "📐 1. Architecture Compliance"

# Check for machine connectivity code (should NOT exist)
print_info "Checking for machine connectivity code..."
if [ -d "backend/src" ]; then
    CONNECTIVITY_COUNT=$(grep -r "mqtt\|websocket\|socket\.io\|machine.*api\|device.*connect" backend/src/ 2>/dev/null | grep -v "node_modules" | wc -l)
    if [ "$CONNECTIVITY_COUNT" -eq 0 ]; then
        print_success "No machine connectivity code found (correct)"
    else
        print_error "Found $CONNECTIVITY_COUNT machine connectivity references (violates manual operations architecture)"
    fi
else
    print_warning "Backend directory not found"
fi

# Check photo validation in tasks
print_info "Checking photo validation in task completion..."
if [ -d "backend/src/modules/tasks" ]; then
    PHOTO_VALIDATION=$(grep -r "photo\|image" backend/src/modules/tasks/ 2>/dev/null | wc -l)
    if [ "$PHOTO_VALIDATION" -gt 0 ]; then
        print_success "Photo validation implemented ($PHOTO_VALIDATION references found)"
    else
        print_error "No photo validation found in tasks module"
    fi
else
    print_warning "Tasks module not found"
fi

# Check inventory updates
print_info "Checking inventory update logic..."
if [ -d "backend/src/modules/inventory" ]; then
    INVENTORY_UPDATES=$(grep -r "updateInventory\|transfer" backend/src/modules/inventory/ 2>/dev/null | wc -l)
    if [ "$INVENTORY_UPDATES" -gt 0 ]; then
        print_success "Inventory update logic found ($INVENTORY_UPDATES references)"
    else
        print_warning "Limited inventory update logic found"
    fi
else
    print_warning "Inventory module not found"
fi

# ============================================================
# 2. CODE QUALITY & CONVENTIONS
# ============================================================
print_section "📝 2. Code Quality & Conventions"

# Check file naming (should be kebab-case)
print_info "Checking file naming conventions..."
if [ -d "backend/src" ]; then
    BAD_NAMES=$(find backend/src/modules -name "*[A-Z]*.ts" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    if [ "$BAD_NAMES" -eq 0 ]; then
        print_success "All files use kebab-case naming"
    else
        print_warning "Found $BAD_NAMES files with uppercase letters"
        find backend/src/modules -name "*[A-Z]*.ts" -not -path "*/node_modules/*" 2>/dev/null | head -5
    fi
fi

# Check for any types
print_info "Checking for 'any' types..."
if [ -d "backend/src" ]; then
    ANY_TYPES=$(grep -r ": any" backend/src/modules/ 2>/dev/null | grep -v ".spec.ts" | grep -v "node_modules" | wc -l)
    if [ "$ANY_TYPES" -eq 0 ]; then
        print_success "No 'any' types found in production code"
    elif [ "$ANY_TYPES" -lt 5 ]; then
        print_warning "Found $ANY_TYPES 'any' types in production code"
    else
        print_error "Found $ANY_TYPES 'any' types in production code (limit to < 5)"
    fi
fi

# Check for BaseEntity usage
print_info "Checking entities extend BaseEntity..."
if [ -d "backend/src/modules" ]; then
    TOTAL_ENTITIES=$(find backend/src/modules -name "*.entity.ts" 2>/dev/null | wc -l)
    if [ "$TOTAL_ENTITIES" -gt 0 ]; then
        ENTITIES_WITH_BASE=$(grep -l "extends BaseEntity" backend/src/modules/*/entities/*.entity.ts 2>/dev/null | wc -l)
        if [ "$ENTITIES_WITH_BASE" -eq "$TOTAL_ENTITIES" ]; then
            print_success "All $TOTAL_ENTITIES entities extend BaseEntity"
        else
            print_warning "$ENTITIES_WITH_BASE/$TOTAL_ENTITIES entities extend BaseEntity"
        fi
    else
        print_info "No entities found (new project?)"
    fi
fi

# ============================================================
# 3. SECURITY
# ============================================================
print_section "🔒 3. Security"

# Check for hardcoded secrets
print_info "Checking for hardcoded secrets..."
if [ -d "backend/src" ]; then
    HARDCODED_SECRETS=$(grep -r "password\s*=\s*['\"].\|secret\s*=\s*['\"].\|key\s*=\s*['\"]." backend/src/ 2>/dev/null | grep -v ".env\|.example\|node_modules\|.spec.ts" | wc -l)
    if [ "$HARDCODED_SECRETS" -eq 0 ]; then
        print_success "No hardcoded secrets found"
    else
        print_error "Found $HARDCODED_SECRETS potential hardcoded secrets"
        grep -r "password\s*=\s*['\"].\|secret\s*=\s*['\"].\|key\s*=\s*['\"]." backend/src/ 2>/dev/null | grep -v ".env\|.example\|node_modules\|.spec.ts" | head -3
    fi
fi

# Check for unprotected routes
print_info "Checking for unprotected routes..."
if [ -d "backend/src/modules" ]; then
    TOTAL_ROUTES=$(grep -r "@Post\|@Get\|@Put\|@Patch\|@Delete" backend/src/modules/*/controllers/*.controller.ts 2>/dev/null | wc -l)
    PROTECTED_ROUTES=$(grep -B 3 "@Post\|@Get\|@Put\|@Patch\|@Delete" backend/src/modules/*/controllers/*.controller.ts 2>/dev/null | grep -c "@UseGuards")

    if [ "$TOTAL_ROUTES" -gt 0 ]; then
        PROTECTION_RATIO=$((PROTECTED_ROUTES * 100 / TOTAL_ROUTES))
        if [ "$PROTECTION_RATIO" -gt 80 ]; then
            print_success "$PROTECTED_ROUTES/$TOTAL_ROUTES routes protected ($PROTECTION_RATIO%)"
        elif [ "$PROTECTION_RATIO" -gt 50 ]; then
            print_warning "$PROTECTED_ROUTES/$TOTAL_ROUTES routes protected ($PROTECTION_RATIO%) - should be > 80%"
        else
            print_error "$PROTECTED_ROUTES/$TOTAL_ROUTES routes protected ($PROTECTION_RATIO%) - critical issue"
        fi
    fi
fi

# Check for raw SQL queries
print_info "Checking for raw SQL queries..."
if [ -d "backend/src" ]; then
    RAW_SQL=$(grep -r "\.query(" backend/src/modules/ 2>/dev/null | grep -v ".spec.ts\|node_modules" | wc -l)
    if [ "$RAW_SQL" -eq 0 ]; then
        print_success "No raw SQL queries found"
    else
        print_warning "Found $RAW_SQL raw SQL queries (review for SQL injection)"
    fi
fi

# ============================================================
# 4. TESTING
# ============================================================
print_section "🧪 4. Testing"

print_info "Checking for test files..."
if [ -d "backend/src" ]; then
    TOTAL_SERVICES=$(find backend/src/modules -name "*.service.ts" 2>/dev/null | grep -v ".spec.ts" | wc -l)
    TEST_FILES=$(find backend/src/modules -name "*.spec.ts" 2>/dev/null | wc -l)

    if [ "$TOTAL_SERVICES" -gt 0 ]; then
        TEST_COVERAGE=$((TEST_FILES * 100 / TOTAL_SERVICES))
        if [ "$TEST_COVERAGE" -gt 70 ]; then
            print_success "Found $TEST_FILES test files for $TOTAL_SERVICES services ($TEST_COVERAGE%)"
        elif [ "$TEST_COVERAGE" -gt 50 ]; then
            print_warning "Found $TEST_FILES test files for $TOTAL_SERVICES services ($TEST_COVERAGE%) - should be > 70%"
        else
            print_error "Found $TEST_FILES test files for $TOTAL_SERVICES services ($TEST_COVERAGE%) - critical"
        fi
    fi
fi

# Run tests if package.json exists
if [ -f "backend/package.json" ]; then
    print_info "Running tests..."
    cd backend
    if npm run test -- --passWithNoTests --silent 2>&1 | tail -20; then
        print_success "Tests passed"
    else
        print_error "Tests failed"
    fi
    cd ..
else
    print_warning "Backend package.json not found, skipping test execution"
fi

# ============================================================
# 5. DATABASE & MIGRATIONS
# ============================================================
print_section "🗄️ 5. Database & Migrations"

print_info "Checking migrations..."
if [ -d "backend/src/database/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 backend/src/database/migrations/*.ts 2>/dev/null | wc -l)
    if [ "$MIGRATION_COUNT" -gt 0 ]; then
        print_success "Found $MIGRATION_COUNT migration files"
        ls -1t backend/src/database/migrations/*.ts 2>/dev/null | head -5 | xargs -I {} basename {}
    else
        print_warning "No migrations found"
    fi
else
    print_warning "Migrations directory not found"
fi

# ============================================================
# 6. DEPENDENCIES
# ============================================================
print_section "📦 6. Dependencies"

if [ -f "backend/package.json" ]; then
    print_info "Checking for vulnerabilities..."
    cd backend
    AUDIT_RESULT=$(npm audit --audit-level=high 2>&1)

    if echo "$AUDIT_RESULT" | grep -q "found 0 vulnerabilities"; then
        print_success "No high/critical vulnerabilities found"
    else
        VULN_COUNT=$(echo "$AUDIT_RESULT" | grep -oP '\d+(?= vulnerabilities)' | head -1)
        if [ -n "$VULN_COUNT" ] && [ "$VULN_COUNT" -gt 0 ]; then
            print_error "Found $VULN_COUNT vulnerabilities"
            echo "$AUDIT_RESULT" | grep "vulnerabilities" | head -5
        fi
    fi
    cd ..
else
    print_warning "Backend package.json not found"
fi

# ============================================================
# 7. BUILD CHECK
# ============================================================
print_section "🏗️ 7. Build Check"

# Check backend build
if [ -f "backend/package.json" ]; then
    print_info "Building backend..."
    cd backend
    if npm run build 2>&1 | tail -5; then
        print_success "Backend builds successfully"
    else
        print_error "Backend build failed"
    fi
    cd ..
else
    print_warning "Backend package.json not found, skipping build"
fi

# Check frontend build
if [ -f "frontend/package.json" ]; then
    print_info "Building frontend..."
    cd frontend
    if npm run build 2>&1 | tail -5; then
        print_success "Frontend builds successfully"
    else
        print_error "Frontend build failed"
    fi
    cd ..
else
    print_info "Frontend not found (backend-only project?)"
fi

# ============================================================
# 8. DOCUMENTATION
# ============================================================
print_section "📚 8. Documentation"

print_info "Checking for documentation files..."
DOCS_FOUND=0

[ -f "README.md" ] && print_success "README.md exists" && ((DOCS_FOUND++))
[ -f "CLAUDE.md" ] && print_success "CLAUDE.md exists" && ((DOCS_FOUND++))
[ -f ".claude/rules.md" ] && print_success ".claude/rules.md exists" && ((DOCS_FOUND++))
[ -f ".claude/project-review-prompt.md" ] && print_success "project-review-prompt.md exists" && ((DOCS_FOUND++))

if [ "$DOCS_FOUND" -lt 2 ]; then
    print_warning "Only $DOCS_FOUND key documentation files found"
fi

# ============================================================
# SUMMARY
# ============================================================
print_section "📊 Summary"

echo ""
echo -e "${GREEN}✅ Passed checks: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Critical issues: $CRITICAL_ISSUES${NC}"
echo ""

# Overall status
TOTAL_CHECKS=$((PASSED + WARNINGS + CRITICAL_ISSUES))
if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNINGS" -lt 5 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Overall Status: EXCELLENT${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}✓ Overall Status: GOOD (some warnings)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
elif [ "$CRITICAL_ISSUES" -lt 3 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  Overall Status: NEEDS ATTENTION${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 Overall Status: CRITICAL ISSUES FOUND${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo "Completed at: $(date)"
echo ""

# Exit code based on critical issues
if [ "$CRITICAL_ISSUES" -gt 0 ]; then
    exit 1
else
    exit 0
fi
