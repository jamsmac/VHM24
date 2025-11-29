#!/bin/bash
# ============================================================================
# VendHub Manager - Post-Deployment Smoke Tests
# ============================================================================
# Validates critical endpoints after deployment to catch issues early.
# Returns exit code 0 on success, 1 on failure.
#
# Usage:
#   ./smoke-tests.sh <API_URL> [FRONTEND_URL]
#
# Examples:
#   ./smoke-tests.sh https://api.vendhub.com https://vendhub.com
#   ./smoke-tests.sh https://api-staging.vendhub.com
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:3000}"
FRONTEND_URL="${2:-}"
TIMEOUT=10
MAX_RETRIES=3
RETRY_DELAY=5

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "  → Testing: $1"
}

# Make HTTP request with retries
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local method="${3:-GET}"
    local data="${4:-}"

    local retry=0
    local response
    local status_code

    while [ $retry -lt $MAX_RETRIES ]; do
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                --max-time "$TIMEOUT" \
                "$url" 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                --max-time "$TIMEOUT" \
                "$url" 2>/dev/null || echo "000")
        fi

        status_code=$(echo "$response" | tail -n1)

        if [ "$status_code" -eq "$expected_status" ]; then
            echo "$response" | head -n -1
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $MAX_RETRIES ]; then
            log_warn "Retry $retry/$MAX_RETRIES for $url (got $status_code, expected $expected_status)"
            sleep $RETRY_DELAY
        fi
    done

    log_error "Request failed: $url (got $status_code, expected $expected_status)"
    return 1
}

# Run a test and track results
run_test() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    local data="${5:-}"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$name"

    if http_request "$url" "$expected_status" "$method" "$data" > /dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "    ${GREEN}✓ PASSED${NC}"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "    ${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Run a JSON validation test
run_json_test() {
    local name="$1"
    local url="$2"
    local json_path="$3"
    local expected_value="$4"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$name"

    local response
    response=$(http_request "$url" "200" "GET" "") || {
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "    ${RED}✗ FAILED (request failed)${NC}"
        return 1
    }

    local actual_value
    actual_value=$(echo "$response" | jq -r "$json_path" 2>/dev/null || echo "")

    if [ "$actual_value" = "$expected_value" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "    ${GREEN}✓ PASSED${NC} ($json_path = $actual_value)"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "    ${RED}✗ FAILED${NC} (expected $expected_value, got $actual_value)"
        return 1
    fi
}

# ============================================================================
# Smoke Tests
# ============================================================================

echo "============================================================================"
echo "VendHub Manager - Smoke Tests"
echo "============================================================================"
echo "API URL: $API_URL"
[ -n "$FRONTEND_URL" ] && echo "Frontend URL: $FRONTEND_URL"
echo "Time: $(date)"
echo "============================================================================"
echo ""

# ----------------------------------------------------------------------------
# 1. Health Check Endpoints
# ----------------------------------------------------------------------------
echo "1. Health Check Endpoints"
echo "------------------------"

run_test "Health endpoint" "$API_URL/health" 200
run_json_test "Health status is ok" "$API_URL/health" ".status" "ok"
run_test "Liveness probe" "$API_URL/health/live" 200
run_test "Readiness probe" "$API_URL/health/ready" 200

echo ""

# ----------------------------------------------------------------------------
# 2. API Documentation
# ----------------------------------------------------------------------------
echo "2. API Documentation"
echo "--------------------"

run_test "Swagger UI available" "$API_URL/api/docs" 200
run_test "OpenAPI JSON" "$API_URL/api/docs-json" 200

echo ""

# ----------------------------------------------------------------------------
# 3. Authentication Endpoints (without actual auth)
# ----------------------------------------------------------------------------
echo "3. Authentication Endpoints"
echo "---------------------------"

# Test that auth endpoints exist (will return 401 or 400, not 404)
run_test "Login endpoint exists" "$API_URL/auth/login" 400 "POST" '{"email":"","password":""}'
run_test "Register endpoint exists" "$API_URL/auth/register" 400 "POST" '{"email":"","password":""}'

echo ""

# ----------------------------------------------------------------------------
# 4. Protected Endpoints (should return 401)
# ----------------------------------------------------------------------------
echo "4. Protected Endpoints (expect 401)"
echo "------------------------------------"

run_test "Users endpoint protected" "$API_URL/users" 401
run_test "Machines endpoint protected" "$API_URL/machines" 401
run_test "Tasks endpoint protected" "$API_URL/tasks" 401

echo ""

# ----------------------------------------------------------------------------
# 5. Metrics and Monitoring
# ----------------------------------------------------------------------------
echo "5. Metrics and Monitoring"
echo "-------------------------"

run_test "Prometheus metrics" "$API_URL/metrics" 200

echo ""

# ----------------------------------------------------------------------------
# 6. Frontend (if URL provided)
# ----------------------------------------------------------------------------
if [ -n "$FRONTEND_URL" ]; then
    echo "6. Frontend"
    echo "-----------"

    run_test "Frontend home page" "$FRONTEND_URL" 200
    run_test "Frontend login page" "$FRONTEND_URL/login" 200

    echo ""
fi

# ----------------------------------------------------------------------------
# 7. Database Connectivity (via health check)
# ----------------------------------------------------------------------------
echo "7. Database Connectivity"
echo "------------------------"

run_json_test "Database is up" "$API_URL/health" ".info.database.status" "up"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "============================================================================"
echo "Summary"
echo "============================================================================"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some smoke tests failed. Please investigate.${NC}"
    exit 1
fi
