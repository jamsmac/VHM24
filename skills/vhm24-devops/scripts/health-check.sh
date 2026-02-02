#!/bin/bash
# VendHub Health Check Script
# Usage: ./health-check.sh [environment]
# Example: ./health-check.sh staging

set -e

# Configuration
ENV=${1:-staging}

case $ENV in
  staging)
    API_URL="https://api-staging.vendhub.uz"
    APP_URL="https://app-staging.vendhub.uz"
    ;;
  production)
    API_URL="https://api.vendhub.uz"
    APP_URL="https://app.vendhub.uz"
    ;;
  local)
    API_URL="http://localhost:3000"
    APP_URL="http://localhost:3001"
    ;;
  *)
    echo "Unknown environment: $ENV"
    echo "Usage: $0 [staging|production|local]"
    exit 1
    ;;
esac

echo "=========================================="
echo "VendHub Health Check - $ENV"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name: OK ($response)"
        return 0
    else
        echo -e "${RED}✗${NC} $name: FAILED (expected $expected_status, got $response)"
        return 1
    fi
}

check_response_time() {
    local name=$1
    local url=$2
    local max_time=${3:-2}

    time_total=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "999")

    if (( $(echo "$time_total < $max_time" | bc -l) )); then
        echo -e "${GREEN}✓${NC} $name: ${time_total}s (< ${max_time}s)"
        return 0
    else
        echo -e "${YELLOW}!${NC} $name: ${time_total}s (> ${max_time}s - SLOW)"
        return 1
    fi
}

FAILED=0

echo "=== API Health ==="
check_endpoint "API Health" "$API_URL/health" || FAILED=$((FAILED+1))
check_endpoint "API Root" "$API_URL/api" || FAILED=$((FAILED+1))
check_response_time "API Response Time" "$API_URL/health" 1

echo ""
echo "=== Frontend Health ==="
check_endpoint "Frontend" "$APP_URL" || FAILED=$((FAILED+1))
check_response_time "Frontend Response Time" "$APP_URL" 2

echo ""
echo "=== API Endpoints ==="
check_endpoint "Swagger Docs" "$API_URL/api/docs" || true  # Optional
check_endpoint "Metrics" "$API_URL/metrics" 401  # Should require auth

echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED critical check(s) failed!${NC}"
    exit 1
fi
