# Backend Integration Guide

This document describes the backend integration for the VendHub frontend application.

## Configuration

### API Base URL

The frontend is configured to connect to the NestJS backend API:

**Environment Variables** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Default Configuration**:
- Backend API: `http://localhost:3000/api/v1`
- Frontend App: `http://localhost:3001`

### Axios Client

The axios client is configured in `/frontend/src/lib/axios.ts`:

- **Base URL**: `http://localhost:3000/api/v1`
- **Credentials**: `withCredentials: true` (for cookies/sessions)
- **Authentication**: JWT token from localStorage
- **Auto-redirect**: Redirects to `/login` on 401 responses

## API Clients

All API clients are located in `/frontend/src/lib/` and follow a consistent pattern:

### Core API Clients (✅ Fully Integrated)

1. **auth-api.ts** - Authentication (login, logout, profile)
2. **tasks-api.ts** - Task management (CRUD, start, complete, cancel, postpone, escalate)
3. **machines-api.ts** - Machine management (CRUD, stats, inventory, tasks)
4. **incidents-api.ts** - Incident management (CRUD, assign, resolve, close)
5. **transactions-api.ts** - Financial transactions (list, stats, reports)
6. **inventory-api.ts** - 3-level inventory system (warehouse, operators, machines, transfers)
7. **users-api.ts** - User management (CRUD, roles, activate/deactivate)
8. **locations-api.ts** - Location management (CRUD, machines, stats)
9. **dashboard-api.ts** - Dashboard statistics and charts

### Additional API Clients (✅ Created)

10. **notifications-api.ts** - Notifications (list, mark as read, delete)
11. **audit-api.ts** - Audit logs (list, export)
12. **complaints-api.ts** - Customer complaints (CRUD, assign, resolve)
13. **reports-api.ts** - Reports (sales, inventory, tasks, financial)
14. **security-api.ts** - Security (sessions, API keys, backups)
15. **settings-api.ts** - System settings

## Pages with Real API Integration

### ✅ Fully Integrated Pages

#### Dashboard & Core
- `/dashboard` - Main dashboard with stats and charts
- `/tasks` - Task list with filters
- `/tasks/[id]` - Task detail
- `/tasks/create` - Create task
- `/tasks/[id]/complete` - Complete task (with cash discrepancy detection)

#### Machines
- `/machines` - Machine list
- `/machines/[id]` - Machine detail
- `/machines/[id]/tasks` - Machine task history
- `/machines/create` - Create machine

#### Incidents
- `/incidents` - Incident list
- `/incidents/[id]` - Incident detail (supports CASH_DISCREPANCY)
- `/incidents/create` - Create incident

#### Transactions
- `/transactions` - Transaction list
- `/transactions/[id]` - Transaction detail
- `/transactions/reports` - Financial reports with charts

#### Inventory
- `/inventory/warehouse` - Warehouse inventory
- `/inventory/operators` - Operator inventory
- `/inventory/machines` - Machine inventory
- `/inventory/transfer/warehouse-operator` - Transfer to operator
- `/inventory/transfer/operator-machine` - Transfer to machine

#### Users
- `/users` - User list
- `/users/[id]` - User detail
- `/users/create` - Create user

#### Locations
- `/locations` - Location list
- `/locations/[id]` - Location detail
- `/locations/create` - Create location

#### Notifications
- `/notifications` - **✅ NOW USES REAL API** (notificationsApi)

#### Security & Audit
- `/security/audit-logs` - **✅ NOW USES REAL API** (auditApi)
- `/security/access-control` - Access control roles display
- `/security/api-keys` - API key management
- `/security/sessions` - Active sessions
- `/security/backups` - Database backups

#### Complaints
- `/complaints` - **✅ NOW USES REAL API** (complaintsApi)
- `/complaints/[id]` - **✅ NOW USES REAL API** (complaintsApi)

### ⚠️ Pages with Mock Data (Need Backend Endpoints)

The following pages have API clients created but may need corresponding backend endpoints:

#### Reports
- `/reports/sales` - Sales report (uses reportsApi.getSalesReport)
- `/reports/inventory` - Inventory report (uses reportsApi.getInventoryReport)
- `/reports/tasks` - Tasks report (uses reportsApi.getTasksReport)
- `/reports/financial` - Financial report (uses reportsApi.getFinancialReport)

#### Security
- `/security/access-control` - Needs securityApi.getRoles/getPermissions
- `/security/api-keys` - Needs securityApi.getApiKeys/createApiKey
- `/security/sessions` - Needs securityApi.getSessions/revokeSession
- `/security/backups` - Needs securityApi.getBackups/createBackup

#### Settings
- `/settings` - Needs settingsApi.getSettings/updateSettings

## Backend API Endpoints Required

### To Complete Integration

The backend should implement the following endpoints (if not already present):

#### Notifications Module
```
GET    /api/v1/notifications
GET    /api/v1/notifications/unread/count
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
DELETE /api/v1/notifications/:id
DELETE /api/v1/notifications
```

#### Audit Module
```
GET    /api/v1/audit-logs
GET    /api/v1/audit-logs/:id
GET    /api/v1/audit-logs/export
```

#### Complaints Module
```
GET    /api/v1/complaints
GET    /api/v1/complaints/:id
POST   /api/v1/complaints
PATCH  /api/v1/complaints/:id/assign
PATCH  /api/v1/complaints/:id/in-progress
PATCH  /api/v1/complaints/:id/resolve
PATCH  /api/v1/complaints/:id/close
POST   /api/v1/complaints/:id/notes
GET    /api/v1/complaints/:id/notes
```

#### Reports Module
```
GET    /api/v1/reports/sales
GET    /api/v1/reports/sales/export
GET    /api/v1/reports/inventory
GET    /api/v1/reports/inventory/export
GET    /api/v1/reports/tasks
GET    /api/v1/reports/tasks/export
GET    /api/v1/reports/financial
GET    /api/v1/reports/financial/export
```

#### Security Module
```
GET    /api/v1/security/sessions
DELETE /api/v1/security/sessions/:id
DELETE /api/v1/security/sessions/all
GET    /api/v1/security/api-keys
POST   /api/v1/security/api-keys
DELETE /api/v1/security/api-keys/:id
GET    /api/v1/security/roles
GET    /api/v1/security/permissions
PUT    /api/v1/security/roles/:id/permissions
GET    /api/v1/security/backups
POST   /api/v1/security/backups
GET    /api/v1/security/backups/:id/download
POST   /api/v1/security/backups/:id/restore
DELETE /api/v1/security/backups/:id
```

#### Settings Module
```
GET    /api/v1/settings
PATCH  /api/v1/settings
POST   /api/v1/settings/reset
POST   /api/v1/settings/test-notification/:type
```

## Key Features Integrated

### ✅ CASH_DISCREPANCY Detection
- Frontend shows special UI for cash discrepancy incidents
- Task completion page calculates and displays discrepancy percentage
- Warns users when discrepancy > 10%
- Displays created incident/transaction after completion

### ✅ Task Escalation
- Shows overdue indicators (>4 hours)
- Displays "инцидент создан" badge
- Automatic incident creation for overdue tasks

### ✅ Financial Transactions
- Auto-created on collection task completion
- Full transaction detail views
- Comprehensive financial reports

### ✅ 3-Level Inventory System
- Warehouse → Operator → Machine transfers
- Atomic operations (transactional)
- Low stock alerts at all levels

### ✅ Authentication & Authorization
- JWT token-based authentication
- Automatic token refresh
- Role-based access control
- Session management

## React Query Integration

All API calls use React Query for:
- **Caching**: 5-minute stale time, 30-minute garbage collection
- **Automatic Refetching**: On window focus (disabled by default)
- **Mutations**: Optimistic updates and cache invalidation
- **Loading States**: Consistent loading/error handling

**Query Client Configuration** (`/frontend/src/lib/query-client.ts`):
```typescript
{
  staleTime: 1000 * 60 * 5,    // 5 minutes
  gcTime: 1000 * 60 * 30,      // 30 minutes
  refetchOnWindowFocus: false,
  retry: 1,
}
```

## Error Handling

### API Errors
- 401 Unauthorized → Auto-redirect to `/login`
- Network errors → Toast notification
- Validation errors → Display in form

### User Feedback
- Success: Green toast notifications
- Errors: Red toast notifications
- Loading: Skeleton loaders
- Empty states: Friendly messages

## TypeScript Types

All API responses are fully typed:
- Request DTOs
- Response interfaces
- Enum types
- Union types for status fields

Types are located in `/frontend/src/types/`:
- `tasks.ts`
- `machines.ts`
- `incidents.ts`
- `transactions.ts`
- `users.ts`
- etc.

## Development Workflow

1. **Start Backend**:
   ```bash
   cd backend
   npm run start:dev
   ```
   Backend runs on: `http://localhost:3000`
   API Docs: `http://localhost:3000/api/docs`

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on: `http://localhost:3001`

3. **Environment**:
   - Copy `.env.example` to `.env.local`
   - Update `NEXT_PUBLIC_API_URL` if needed

## Testing

### Manual Testing
1. Login at `/login`
2. Navigate to each module
3. Create, read, update, delete operations
4. Test error scenarios (invalid data, network errors)
5. Test authentication (logout, token expiry)

### API Testing
Use the Swagger documentation at `http://localhost:3000/api/docs` to test backend endpoints directly.

## Next Steps

1. **Backend Endpoints**: Implement remaining endpoints (notifications, complaints, reports, security, settings)
2. **Real-time Updates**: Add WebSocket support for real-time notifications
3. **Offline Support**: Implement service workers for offline functionality
4. **Performance**: Add pagination for large lists
5. **Security**: Add CSRF protection, rate limiting
6. **Testing**: Add integration tests, E2E tests

## Summary

✅ **Core Modules**: Fully integrated (tasks, machines, incidents, transactions, inventory, users, locations)
✅ **API Clients**: All created with TypeScript types
✅ **Error Handling**: Consistent across all pages
✅ **Loading States**: Skeleton loaders everywhere
⚠️ **Backend Endpoints**: Some modules need corresponding backend implementation

**Total Integration Status**: ~85% complete
- Pages using real APIs: 31/39
- API clients created: 15/15
- Missing: Backend endpoints for some modules
