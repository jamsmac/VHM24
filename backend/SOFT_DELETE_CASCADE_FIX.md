# Soft Delete Cascade Logic & Frontend URL Fix

## Date: 2025-11-24
## Author: VendHub Development Team

This document describes the critical fixes implemented to resolve soft delete cascade issues and production deployment dependency problems in the VendHub backend.

## Issues Fixed

### 1. Soft Delete Cascade Logic for Machines (P1)

**Problem:** When a machine was soft deleted, related entities (inventory and tasks) remained active in queries, causing data inconsistency.

**Location:** `/backend/src/modules/machines/machines.service.ts`

**Solution Implemented:**

#### A. Enhanced Machine Deletion Logic

Modified `MachinesService.remove()` method to:
- Check for active tasks before allowing deletion
- Use database transactions for consistency
- Cascade soft delete to related inventory entries
- Provide clear error messages when deletion is blocked

```typescript
async remove(id: string): Promise<void> {
  const machine = await this.findOne(id);

  // Check for active tasks
  const activeTasks = await this.dataSource
    .getRepository('tasks')
    .createQueryBuilder('task')
    .where('task.machine_id = :machineId', { machineId: id })
    .andWhere('task.status IN (:...statuses)', {
      statuses: ['created', 'in_progress', 'assigned']
    })
    .andWhere('task.deleted_at IS NULL')
    .getCount();

  if (activeTasks > 0) {
    throw new BadRequestException(
      `Cannot delete machine: has ${activeTasks} active tasks`
    );
  }

  // Use transaction to ensure consistency
  await this.dataSource.transaction(async (manager) => {
    // Soft delete related inventory entries
    await manager
      .createQueryBuilder()
      .update('machine_inventory')
      .set({ deleted_at: new Date() })
      .where('machine_id = :machineId', { machineId: id })
      .andWhere('deleted_at IS NULL')
      .execute();

    // Soft delete the machine itself
    await manager.softRemove(Machine, machine);
  });
}
```

#### B. Added Soft Delete Filters to Queries

Updated query methods to exclude soft-deleted entities:

1. **MachinesService.findAll()** - Added `WHERE machine.deleted_at IS NULL`
2. **InventoryService.getMachineInventory()** - Filters out deleted inventory and machines
3. **InventoryService.getMachinesLowStock()** - Excludes deleted machines from low stock reports
4. **TasksService.findAll()** - Excludes tasks for deleted machines

### 2. Fix FRONTEND_URL Dependency in Production (P1)

**Problem:** The application failed to start in production without FRONTEND_URL, causing deployment failures.

**Location:** `/backend/src/main.ts`

**Solution Implemented:**

Changed from fatal error to warning with graceful degradation:

```typescript
// Before: Fatal error
if (isProduction && !frontendUrl) {
  throw new Error('FRONTEND_URL must be set in production');
}

// After: Warning with fallback
if (isProduction && !frontendUrl) {
  console.warn(
    'WARNING: FRONTEND_URL is not set in production environment.\n' +
    'CORS will be configured with restrictive defaults.'
  );
}

// Configure CORS based on environment
let corsOptions: any;

if (frontendUrl) {
  // Use provided FRONTEND_URL
  corsOptions = {
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
} else if (isProduction) {
  // Production without FRONTEND_URL: restrictive CORS (same-origin only)
  corsOptions = {
    origin: false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
} else {
  // Development: allow localhost
  corsOptions = {
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
```

## Files Modified

1. `/backend/src/modules/machines/machines.service.ts`
   - Added DataSource injection
   - Enhanced remove() method with cascade logic
   - Added soft delete filter to findAll()

2. `/backend/src/modules/inventory/inventory.service.ts`
   - Updated getMachineInventory() to filter deleted machines
   - Updated getMachinesLowStock() to exclude deleted machines

3. `/backend/src/modules/tasks/tasks.service.ts`
   - Added soft delete filters to findAll()

4. `/backend/src/main.ts`
   - Made FRONTEND_URL optional with warning
   - Added fallback CORS configuration

5. `/backend/src/modules/machines/machines.service.spec.ts`
   - Added tests for soft delete cascade
   - Updated tests to verify soft delete filtering

## Testing

Tests have been added/updated to verify:
- Soft delete cascades to inventory
- Active tasks prevent machine deletion
- Deleted machines are excluded from queries
- CORS configuration works without FRONTEND_URL

Run tests with:
```bash
npm test -- machines.service.spec.ts
```

## Deployment Notes

1. **Database Migration**: No migration needed as soft delete columns already exist
2. **Environment Variables**: FRONTEND_URL is now optional in production
3. **Monitoring**: Watch for warnings about missing FRONTEND_URL in logs
4. **CORS**: If FRONTEND_URL is not set, only same-origin requests will be allowed

## Benefits

1. **Data Integrity**: Soft deleted machines no longer appear in active queries
2. **Cascade Protection**: Related inventory is properly handled during deletion
3. **Task Safety**: Cannot delete machines with active tasks
4. **Deployment Resilience**: Application starts even without FRONTEND_URL
5. **Security**: Restrictive CORS when frontend URL is unknown

## Future Considerations

1. Consider adding a scheduled job to hard delete old soft-deleted records
2. Add admin endpoint to view soft-deleted entities
3. Implement restore functionality for accidentally deleted machines
4. Add cascade options configuration (e.g., what to do with completed tasks)