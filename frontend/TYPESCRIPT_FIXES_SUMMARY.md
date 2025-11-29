# TypeScript Fixes Summary

## Remaining Errors: 101

### Categories:

## 1. Dialog Component API Fixes (4 files)
**Files:**
- `src/components/equipment/SparePartModal.tsx`
- `src/components/equipment/StockAdjustmentModal.tsx`
- `src/components/equipment/QRScanner.tsx`

**Fix Pattern:**
```typescript
// Before
<Dialog isOpen={isOpen} onClose={onClose} title="..." size="lg">
  <form>...</form>
</Dialog>

// After
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
    </DialogHeader>
    <form>...</form>
  </DialogContent>
</Dialog>
```

## 2. InventoryItem Type Fixes (11 errors)
**Issue:** `product`, `min_stock`, `max_capacity` accessed without null checks

**Files:**
- `src/app/(dashboard)/inventory/machines/page.tsx`
- `src/app/(dashboard)/inventory/operators/page.tsx`
- `src/app/(dashboard)/inventory/transfer/operator-machine/page.tsx`

**Fix Pattern:**
```typescript
// Before
{item.product.name}
{item.min_stock}

// After
{item.product?.name || 'N/A'}
{item.min_stock ?? 0}
```

## 3. Task Type Missing Properties (10+ errors)
**Missing:** `notes`, `completed_by`, `expected_cash_amount`, `components`

**Solution:** Update `src/types/tasks.ts` to include all properties used in the app

## 4. Machine Type Missing Properties (5 errors)
**Missing:** `current_cash`, `last_sync`, `description`

**Solution:** Update `src/types/machines.ts`

## 5. Location Type Issues (10+ errors)
**Missing:** `location_type`, `foot_traffic`
**Issue:** API signature mismatch in useQuery

**Files:** `src/app/(dashboard)/locations/page.tsx`, `src/app/(dashboard)/locations/[id]/page.tsx`

## 6. Implicit Any Types (17 errors)
Add explicit type annotations to all parameters

## 7. CreateIncidentDto Missing `title` (1 error)
Add title field to incident creation form

## 8. TaskType enum incomplete (1 error)
Add missing task types to type definition

## 9. Button `fullWidth` prop (3 errors)
Replace with className="w-full"

## 10. TaskStatus/TaskPriority string literals (6 errors)
Replace string literals with enum values
