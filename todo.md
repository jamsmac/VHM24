# VendHub Manager - TODO List

## Phase 1: Telegram Bot Integration
- [x] Install telegram bot SDK (node-telegram-bot-api or telegraf)
- [x] Create Telegram bot service in server
- [x] Set up webhook endpoint for bot messages
- [x] Implement /start command (registration request)
- [x] Implement /status command (user status check)
- [x] Implement /help command
- [x] Create access request approval flow in admin panel
- [ ] Add Telegram ID linking to user profiles

## Phase 2: Russian UI & Navigation
- [ ] Update all UI text to Russian
- [ ] Implement collapsible sidebar (240px / 64px modes)
- [ ] Add Command Palette (⌘K) component
- [ ] Create header with notifications bell
- [ ] Implement user menu dropdown
- [ ] Add favorites section to sidebar
- [ ] Create breadcrumb navigation

## Phase 3: Core Modules - Operations
- [ ] Machines list page with filters
- [ ] Machine detail card with real-time status
- [ ] Machine map view (already exists, update UI)
- [ ] Tasks kanban board
- [ ] Tasks calendar view
- [ ] Equipment components registry
- [ ] Locations management
- [ ] QR scanner page

## Phase 4: Core Modules - Inventory & Finance
- [ ] Inventory 3-level view (already exists, update UI)
- [ ] Products/Ingredients catalog
- [ ] Recipes builder with cost calculator
- [ ] Purchases/Procurement module
- [ ] Transactions list
- [ ] Counterparties (suppliers/clients)
- [ ] Contracts management
- [ ] Commissions settings

## Phase 5: Core Modules - Analytics & Team
- [ ] Sales analytics dashboard
- [ ] Inventory analytics
- [ ] Efficiency reports
- [ ] Report builder
- [ ] Incidents tracking
- [ ] Users management (already exists, update UI)
- [ ] Access requests approval
- [ ] Complaints module

## Phase 6: System & Settings
- [ ] System settings page
- [ ] Telegram bot configuration panel
- [ ] Notification preferences
- [ ] Role permissions editor
- [ ] Audit logs viewer
- [ ] Backup/restore functionality

## Phase 6.5: Notification System
- [ ] Set up email notification service (SMTP/SendGrid)
- [ ] Create notification templates (Telegram + Email)
- [ ] Implement notification triggers for key events
- [ ] Add notification preferences to user settings
- [ ] Test notification delivery for all scenarios

## Phase 7: GitHub Repository
- [ ] Initialize new repo at https://github.com/jamsmac/VHM24
- [ ] Create README with setup instructions
- [ ] Add .env.example with all required variables
- [ ] Configure GitHub Actions for CI/CD
- [ ] Push initial code
- [ ] Create deployment documentation

## New Features - Access Requests
- [x] Add search bar to filter access requests by name or Telegram ID
- [x] Add bulk selection with checkboxes for mass approve/reject actions
- [x] Add role dropdown to change user role before approving request
- [x] Add bulk role assignment for multiple selected requests
- [x] Add admin comments field to access requests for internal notes
- [x] Integrate SMTP service (Nodemailer) for email notifications
- [x] Create email templates for access request approval/rejection
- [x] Send email notifications when requests are approved or rejected
- [x] Add email configuration to environment variables
- [x] Add email field to access_requests database schema
- [x] Create unit tests for email service

## New Features - Audit Log System
- [x] Create access_request_audit_logs database table
- [x] Add database operations for logging approval/rejection actions
- [x] Create tRPC API endpoint for fetching audit logs
- [x] Build audit log UI component with timeline view
- [x] Integrate audit log display into access requests page
- [x] Add unit tests for audit log functionality

## New Features - Dashboard Widget
- [x] Create RecentAdminActions component
- [x] Integrate widget into main dashboard
- [x] Display last 5 audit log entries with action badges
- [x] Add link to full audit log page

## New Features - Date Range Filtering
- [x] Install react-day-picker for date selection
- [x] Add date range filtering to audit log API endpoint
- [x] Update database queries to support date filtering
- [x] Create preset filter buttons (All Time, Today, 7 Days, 30 Days)
- [x] Integrate date filtering into audit log section
- [x] Add unit tests for date filtering (9 tests passing)

## New Features - Custom Date Picker
- [x] Create DateRangePicker component with react-day-picker
- [x] Add calendar UI with range selection (dual month view)
- [x] Integrate custom picker with preset filters
- [x] Add calendar button with popover interface
- [x] Display selected date range in readable Russian format
- [x] Add clear/reset functionality
- [x] Custom dark theme styling for calendar

## New Features - Action Type Filter
- [x] Add action type parameter to audit log API endpoint
- [x] Update database queries to support action type filtering
- [x] Create action type dropdown component
- [x] Add filter options (All Actions, Approved, Rejected)
- [x] Integrate action filter with date filters
- [x] Add unit tests for action type filtering (9 tests passing)

## New Features - Audit Log Enhancements
- [x] Implement CSV export functionality for filtered audit logs
- [x] Create download button with export icon
- [x] Generate CSV with proper headers and data formatting (UTF-8 BOM)
- [x] Add search input to filter by admin/user name
- [x] Implement client-side search filtering
- [x] Add statistics summary badges (approved/rejected counts)
- [x] Display statistics based on current filters
- [x] Export respects all active filters (date, action type, search)

## New Features - Bulk Actions
- [x] Add checkbox selection to access request table
- [x] Implement select all/deselect all functionality
- [x] Create bulk approve/reject buttons
- [x] Add confirmation dialog for bulk operations
- [x] Update API to handle bulk operations
- [x] Show success/error toasts for bulk actions
- [x] Add bulk role selection dropdown

## New Features - Email Digest Scheduling
- [x] Create email digest generation function
- [x] Design daily/weekly digest email templates (HTML with statistics)
- [x] Implement cron job for scheduled email sending (node-cron)
- [x] Add digest configuration (frequency, recipients via env vars)
- [x] Include statistics and recent actions in digest
- [x] Initialize scheduler on server startup
- [ ] Add unsubscribe/preferences functionality (future enhancement)

## New Features - Role Change History
- [x] Create role_changes database table
- [x] Track role modifications with old/new values
- [x] Add API endpoints for role change logs (list, byUserId)
- [x] Create "Role Changes" tab in UI (4th tab)
- [x] Display role change timeline with details
- [x] Show old/new role badges with color coding
- [x] Include admin name and timestamp for each change

## New Features - User Role Editing UI
- [x] Add role editing functionality to Users page
- [x] Create role change dialog with reason input field
- [x] Add API endpoint for updating user roles
- [x] Automatically log role changes to roleChanges table
- [x] Show success/error toasts for role updates
- [x] Refresh user list after role change
- [x] Replace mock data with real database integration

## New Features - Digest Configuration UI
- [x] Create Settings page for digest configuration
- [x] Add frequency selector (daily/weekly)
- [x] Add recipient email management (add/remove)
- [x] Add enable/disable toggle for digest
- [x] Add "Test Digest" button to send immediately
- [x] Store configuration in database (digestConfig table)
- [x] Add API endpoints for digest settings (get, update, test)
- [x] Update scheduler to use database config
- [x] Update emailDigest to use database config

## New Features - Notification Preferences
- [x] Add notification preferences fields to users table
- [x] Create user preferences API endpoints (get, update)
- [x] Add notification settings page (/notification-preferences)
- [x] Add email notification opt-in/opt-out toggle
- [x] Add Telegram notification opt-in/opt-out toggle
- [x] Respect preferences when sending notifications (approval/rejection)
- [x] Add getUserByTelegramId helper function


## Phase 8: Localization & Uzbek Features
- [x] Implement i18n framework (react-i18next installed)
- [x] Create English translation file with 100+ keys
- [ ] Complete Russian translation for all UI (next phase)
- [x] Add Uzbek currency (UZS) support with proper formatting
- [x] Add Uzbek-specific validators (phone +998, INN, bank account) - 22 tests
- [x] Add Uzbek date format (DD.MM.YYYY) in validators
- [x] Update Dashboard to show UZS currency
- [x] Add Uzbek regions/locations support in validators
- [ ] Create Uzbek-specific documentation (next phase)

## Phase 9: Navigation & Access Control
- [x] Add sidebar navigation with all pages (MainLayout component)
- [x] Implement role-based access control (admin-only pages)
- [x] Add collapsible sidebar (240px / 64px modes)
- [ ] Implement breadcrumb navigation (next phase)
- [ ] Create user menu dropdown (next phase)
- [x] Add notifications bell in header
- [ ] Add command palette (⌘K) (next phase)

## Phase 10: Core Modules UI
- [ ] Machines list page with filters
- [ ] Machine detail page with status
- [ ] Tasks kanban board
- [ ] Tasks calendar view
- [ ] Inventory 3-level view
- [ ] Transactions list
- [ ] Incidents tracking
- [ ] Complaints management


## Phase 11: Machines Module (No QR Codes)
- [ ] Create machines database table with schema
- [ ] Add machine status enum (active, maintenance, offline, retired)
- [ ] Create tRPC API endpoints for machines (list, get, create, update, delete)
- [ ] Implement machine list page with filters (status, location, type)
- [ ] Add search functionality for machine name/ID
- [ ] Create machine detail page with full information
- [ ] Add location/map integration for machine placement
- [ ] Create machine status history tracking
- [ ] Add machine photo upload functionality
- [ ] Implement machine performance metrics
- [ ] Create unit tests for machine operations


## Phase 11: Machines Module
- [ ] Add machines API endpoints (list, get, create, update, delete)
- [ ] Create Machines list page with status display
- [ ] Add status color coding (active=green, offline=red, maintenance=yellow)
- [ ] Implement search by machine name/serial number
- [ ] Add filters by status and location
- [ ] Create machine detail page
- [ ] Add machine edit dialog
- [ ] Implement machine creation form
- [ ] Add location/map display
- [ ] Create unit tests for machines operations


## Phase 12: Machine Detail Page
- [x] Create machine detail page component
- [x] Display complete machine information (name, serial, model, location)
- [x] Show operational status with color coding
- [x] Display revenue statistics and sales metrics
- [x] Add maintenance history timeline
- [x] Show next service due date with warnings
- [x] Implement edit machine dialog
- [x] Add status update functionality
- [x] Create maintenance log entry form
- [ ] Add unit tests for detail page operations


## Phase 13: Machines Module Implementation
- [ ] Create machines list page with status display and filtering
- [ ] Create machines detail page with maintenance history
- [ ] Add machine creation/editing forms
- [ ] Implement machine status update functionality
- [ ] Add maintenance logging with cost tracking
- [ ] Create unit tests for machines operations

## Phase 14: Tasks Module Implementation
- [ ] Create tasks list page with status display
- [ ] Build kanban board with drag-and-drop functionality
- [ ] Implement task creation and editing
- [ ] Add task status workflow (pending, in-progress, completed)
- [ ] Create task assignment to users
- [ ] Add task priority levels
- [ ] Create unit tests for tasks operations


## Phase 15: Manual Operations Architecture
- [ ] Create photo validation system for task completion
- [ ] Implement before/after photo requirements for tasks
- [ ] Add photo upload and storage integration
- [ ] Create photo gallery view in task detail page
- [ ] Implement photo validation rules (size, format, quality)
- [ ] Create inventory movement audit trail table
- [ ] Track all inventory changes with timestamps and operators
- [ ] Implement audit log display for inventory movements
- [ ] Create connectivity monitoring system
- [ ] Implement automated offline incident creation
- [ ] Add machine status polling mechanism
- [ ] Create incident notification system
- [ ] Add unit tests for manual operations features


## Phase 16: Machines Module List Page
- [x] Create Machines list page component
- [x] Display machine cards with status badges
- [x] Add statistics dashboard (total, active, offline, maintenance)
- [x] Implement search by machine name or serial number
- [x] Add status filter (all, active, offline, maintenance, retired)
- [x] Add location filter
- [x] Display revenue and sales metrics per machine
- [x] Show last maintenance and next service dates
- [x] Add navigation route for Machines page
- [x] Update sidebar navigation to include Machines link
- [x] Test Machines page functionality


## Phase 17: Machine Detail Page
- [ ] Create MachineDetail page component
- [ ] Display complete machine information (name, serial, model, location, status)
- [ ] Add revenue chart showing daily/weekly/monthly trends
- [ ] Implement maintenance history timeline
- [ ] Show inventory levels for machine
- [ ] Add edit machine dialog with form validation
- [ ] Implement status update functionality
- [ ] Add photo gallery for machine
- [ ] Create maintenance log entry form
- [ ] Add navigation back to machines list

## Phase 18: Tasks Module with Kanban Board
- [ ] Create Tasks page with kanban layout
- [ ] Implement drag-and-drop functionality between columns
- [ ] Add task creation dialog with priority and due date
- [ ] Create task assignment to team members
- [ ] Add task status columns (pending, in-progress, completed)
- [ ] Implement task filtering and search
- [ ] Add task detail view/edit modal
- [ ] Show task statistics dashboard
- [ ] Add photo upload for task completion
- [ ] Implement task notifications

## Phase 19: 3-Level Inventory Tracking
- [ ] Design 3-level inventory database schema (products → components → raw materials)
- [ ] Create Inventory page with hierarchical view
- [ ] Implement stock level tracking with alerts
- [ ] Add inventory transfer functionality between machines
- [ ] Create low stock alerts and notifications
- [ ] Implement inventory adjustment forms
- [ ] Add inventory history tracking
- [ ] Create inventory reports and analytics
- [ ] Implement barcode/SKU search
- [ ] Add bulk inventory operations


## Phase 20: Complete Tasks Module with Drag-and-Drop
- [ ] Complete drag-and-drop functionality implementation in Tasks.tsx
- [ ] Add task creation dialog with form validation
- [ ] Implement task detail modal
- [ ] Enable status updates via drag-and-drop between columns
- [ ] Add task statistics cards (total, pending, in-progress, completed)
- [ ] Test drag-and-drop functionality across all browsers
- [ ] Add task assignment dropdown
- [ ] Implement task priority selection

## Phase 21: Fix TypeScript Errors
- [ ] Fix Date type assignments in server/db.ts (lines 617, 654)
- [ ] Verify getUserByTelegramId function exists in server/db.ts
- [ ] Fix all remaining TypeScript compilation errors
- [ ] Run full test suite to ensure no regressions
- [ ] Verify dev server compiles without errors

## Phase 22: Final Checkpoint
- [ ] Test all implemented features end-to-end
- [ ] Verify Machine Detail page with revenue charts
- [ ] Test Tasks module drag-and-drop functionality
- [ ] Verify all navigation links work correctly
- [ ] Check responsive design on mobile/tablet
- [ ] Save comprehensive checkpoint with all features


## Phase 23: Inventory Tracking System (3-Level Hierarchy)

### Database & API
- [x] Review existing inventory schema in drizzle/schema.ts
- [x] Create inventory router in server/routers/inventory.ts
- [x] Implement getInventoryByLevel endpoint (warehouse/operator/machine)
- [x] Implement getInventoryByProduct endpoint
- [x] Implement updateInventoryQuantity endpoint
- [x] Implement createStockTransfer endpoint
- [x] Implement getStockTransfers endpoint
- [x] Implement getLowStockAlerts endpoint

### UI Components
- [x] Create Inventory page with 3-level tree view
- [x] Add product list with stock levels for each location
- [x] Implement stock level progress bars with color coding
- [x] Add filtering by product category and location
- [x] Create stock transfer modal with validation
- [x] Add low stock alerts section
- [x] Implement search functionality

### Features
- [x] Stock transfer workflow (warehouse → operator → machine)
- [x] Low stock threshold alerts (configurable per product)
- [ ] Stock consumption tracking linked to machine sales
- [ ] Transfer history with audit trail
- [ ] Stock adjustment functionality with reason tracking

### Testing
- [x] Write unit tests for inventory API endpoints
- [x] Test stock transfer logic
- [x] Test low stock alert calculations
- [x] Verify 3-level hierarchy queries


## Phase 24: Stock Transfer Approval & Inventory Adjustments

### Database Schema
- [x] Create inventoryAdjustments table in schema.ts
- [x] Add fields: id, inventoryId, productId, adjustmentType, quantity, reason, photoUrl, performedBy, createdAt
- [x] Add approvedBy and approvedAt fields to stockTransfers table
- [x] Run database migration to apply schema changes

### Stock Transfer Approval Workflow
- [x] Create admin transfers page (/admin/transfers)
- [x] Add API endpoint to get pending transfers
- [x] Create approve transfer mutation with inventory update logic
- [x] Create reject transfer mutation
- [ ] Add notification system for transfer status changes (deferred)
- [ ] Implement automatic inventory adjustment on approval (deferred)
- [x] Add approval history to transfer records

### Transfer History & Audit Trail
- [x] Create transfer history page (/inventory/transfer-history)
- [x] Add filtering by date range, status, user, product
- [ ] Display before/after stock levels for each transfer (deferred)
- [x] Show approval/rejection timestamps and admin names
- [ ] Add export to CSV functionality (deferred)
- [ ] Implement pagination for large datasets (deferred)

### Inventory Adjustment Interface
- [x] Create inventory adjustment form component
- [x] Add adjustment type dropdown (damage, shrinkage, correction, found)
- [x] Implement mandatory reason code field
- [x] Add photo upload functionality for evidence
- [x] Create API endpoint to record adjustments
- [x] Implement automatic inventory quantity update
- [ ] Add adjustment history view per product (deferred)
- [x] Create audit log for all adjustments

### Testing
- [x] Write unit tests for approval workflow
- [x] Test inventory adjustment logic
- [x] Test transfer history filtering
- [x] Verify automatic inventory updates
- [ ] Test notification delivery


## Phase 25: Real-Time Notification System

### Database Schema
- [x] Create notifications table in schema.ts
- [x] Add fields: id, userId, type, title, message, relatedId, read, createdAt
- [x] Run database migration

### Backend Infrastructure
- [x] Create notification service module
- [x] Add createNotification function
- [x] Add getUserNotifications function
- [x] Add markNotificationAsRead function
- [x] Add markAllNotificationsAsRead function
- [ ] Implement real-time push via Server-Sent Events (SSE) (deferred - using polling for now)

### API Endpoints
- [x] Create notifications router
- [x] Add notifications.list endpoint (get user notifications)
- [x] Add notifications.unreadCount endpoint
- [x] Add notifications.markAsRead endpoint
- [x] Add notifications.markAllAsRead endpoint
- [ ] Add notifications.subscribe endpoint (SSE) (deferred)

### Frontend Notification Center
- [x] Create NotificationCenter component
- [x] Add bell icon with unread count badge in header
- [x] Implement dropdown with notification list
- [x] Add mark as read functionality
- [x] Add mark all as read button
- [x] Style notification items with icons and timestamps
- [x] Add empty state for no notifications

### Integration with Transfer Workflow
- [x] Trigger notification on transfer approval
- [x] Trigger notification on transfer rejection
- [x] Send notification to requester with transfer details
- [x] Include link to transfer history
- [x] Add real-time update to notification center

### Testing
- [x] Write unit tests for notification service
- [x] Test notification creation on approval/rejection
- [ ] Test SSE connection and real-time updates (deferred - using polling)
- [x] Verify notification UI updates


## Phase 26: Inventory Enhancements

### Inventory Adjustment Buttons
- [x] Add "Adjust Stock" button to each product card in Inventory page
- [x] Connect button to InventoryAdjustmentModal
- [x] Pass inventory item data to modal
- [x] Refresh inventory data after adjustment

### Automatic Inventory Updates on Transfer Approval
- [x] Implement inventory decrement at source location on approval
- [x] Implement inventory increment at destination location on approval
- [x] Add transaction logging for inventory changes
- [x] Send completion notification with updated stock levels
- [x] Handle edge cases (insufficient stock, missing inventory records)

### Low Stock Alert Notifications
- [x] Create scheduled job for daily low stock checks
- [x] Query inventory items below threshold
- [x] Create notifications for managers/admins
- [x] Include product details and current stock levels
- [x] Add link to inventory page in notification
- [x] Configure job schedule (daily at specific time)

### Testing
- [x] Test adjustment button functionality
- [x] Test automatic inventory updates on approval
- [x] Test low stock alert notification creation
- [x] Verify notification delivery to correct users


## Phase 27: AI-Agent Integration & Claude API

- [ ] Create ProductForm component with AI-agent integration
- [ ] Add AI suggestions for product fields (name, category, price, SKU)
- [ ] Create MachineForm component with AI-agent integration
- [ ] Add AI suggestions for machine fields (name, model, location, status)
- [ ] Build AI-Agent Management Dashboard at /admin/ai-agents
- [ ] Display agent statistics (suggestion accuracy, confirmation rate)
- [ ] Show prompt versions and change history
- [ ] Display improvement history and approvals
- [ ] Implement Claude API integration in generateSuggestions
- [ ] Add Anthropic API key to environment variables
- [ ] Test Claude suggestions with real data
- [ ] Add error handling for API failures
- [ ] Implement suggestion caching
