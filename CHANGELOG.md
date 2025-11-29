# Changelog

All notable changes to VendHub Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔧 Fixed - 2025-11-18

#### CRITICAL: Transactions.recordSale() Now Deducts Inventory

**Issue:** When recording a sale through the API (`POST /api/v1/transactions/sale`), the system was NOT deducting inventory from the machine. This caused inventory levels to become inaccurate over time.

**Root Cause:** The `TransactionsService.recordSale()` method only created a transaction record but did not integrate with `InventoryService` to update stock levels.

**Impact:**
- ❌ Manual sales (via API) did NOT update inventory
- ✅ Imported sales (via Sales Import module) DID update inventory correctly
- Result: Inconsistent inventory tracking

**Solution:**
- Added integration between `TransactionsService` and `InventoryService`
- `recordSale()` now:
  1. Creates transaction record
  2. Fetches recipe ingredients
  3. Deducts each ingredient from machine inventory
  4. Logs all operations for audit
  5. Handles errors gracefully (logs warning if inventory insufficient)

**Files Changed:**
- `backend/src/modules/transactions/transactions.module.ts` - Added InventoryModule and RecipesModule imports
- `backend/src/modules/transactions/transactions.service.ts` - Updated recordSale() method (lines 145-232)
- `backend/src/modules/transactions/transactions.service.integration.spec.ts` - Added comprehensive integration tests

**Testing:**
- Created 9 integration test cases covering:
  - Normal sales with inventory deduction
  - Multiple ingredients
  - Multiple quantities
  - Insufficient stock handling
  - Missing recipe handling
  - Edge cases

**Example:**
```typescript
// Before Fix:
await transactionsService.recordSale({
  machine_id: 'M-001',
  recipe_id: 'cappuccino',
  amount: 15000,
  quantity: 1,
});
// ❌ Inventory NOT updated

// After Fix:
await transactionsService.recordSale({
  machine_id: 'M-001',
  recipe_id: 'cappuccino', // Contains: 10g coffee + 200ml milk
  amount: 15000,
  quantity: 1,
});
// ✅ Coffee: -10g
// ✅ Milk: -200ml
// ✅ Transaction created
// ✅ Inventory movements logged
```

**Breaking Changes:** None

**Migration:** No migration needed. Existing transactions are not affected. Future sales will automatically deduct inventory.

---

### 📊 System Audit - 2025-11-18

**Conducted full system audit** and created detailed status report. Key findings:

✅ **Already Implemented (85% complete):**
- S3 Storage (MinIO + Cloudflare R2 support)
- 3-level Inventory System with reservations
- Sales Import with BullMQ + automatic inventory deduction
- Intelligent Import with AI agents
- Counterparties & Contracts modules
- Telegram Bot (unified, no duplicates)
- Photo validation for tasks
- Comprehensive logging and audit trails

❌ **Issues Fixed:**
- Transactions.recordSale() inventory integration (CRITICAL)

⚠️ **Needs Review:**
- Possible module duplication (counterparties vs counterparty)
- Missing integration tests for some modules
- Documentation updates needed

**Documentation:**
- Created `VENDHUB_STATUS_REPORT.md` - Full system audit with 85% readiness assessment
- Created `CHANGELOG.md` - This file

---

## [0.9.0] - 2025-11-18

### Added
- Full system audit and documentation
- Integration tests for Transactions + Inventory
- Comprehensive logging in recordSale()

### Fixed
- **CRITICAL:** Inventory deduction in manual sales (API)

### Changed
- TransactionsService now integrates with InventoryService and RecipesService
- Enhanced error handling in recordSale()

---

## [0.8.0] - Previous Releases

_(To be documented from git history)_

---

## Versioning Strategy

- **Major (X.0.0):** Breaking changes, major architecture updates
- **Minor (0.X.0):** New features, non-breaking changes
- **Patch (0.0.X):** Bug fixes, minor improvements

Current Version: **0.9.0** (approaching 1.0.0 production-ready release)

---

## Contributing

When making changes:
1. Update this CHANGELOG with your changes
2. Follow [Conventional Commits](https://www.conventionalcommits.org/)
3. Run tests before committing: `npm test`
4. Update documentation if needed

---

*Last Updated: 2025-11-18 by Claude (Autonomous Engineering System)*
