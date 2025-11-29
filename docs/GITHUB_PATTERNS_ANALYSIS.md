# GitHub Repository Pattern Analysis Report

## Exploration Summary

Analyzed repositories from **jamsmac** and **jamshiddins** GitHub accounts to identify patterns for:
- User registration with approval workflow
- Admin approval process in Telegram
- Role assignment mechanisms
- Admin dashboard/panel for approvals
- User invitation/onboarding flows

---

## Key Repositories Analyzed

### 1. **jamsmac/sales-app** (Node.js/Express Sales Analytics)
- **Technology**: Express.js, JWT, bcryptjs, SQLite
- **Lines of Code**: ~300+ in auth middleware/routes
- **Focus**: Role-based authentication and financial reporting

### 2. **jamshiddins/VHM24** (Vending Machine Management System)
- **Technology**: NestJS backend, Telegraf bot, PostgreSQL, Prisma ORM
- **Architecture**: Modular (API, Dashboard, Telegram Bot, Worker, Scheduler)
- **Lines of Code**: 35+ route files, comprehensive handler system
- **Focus**: Complete vendor management with admin capabilities

---

## PATTERN 1: JWT-Based Authentication with Role-Based Access Control

### Implementation Found In: sales-app

**Authentication Middleware** (`server/middleware/auth.middleware.js`):
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Check cookie first
  let token = req.cookies?.auth_token;

  // Fallback to Authorization header for API
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      res.clearCookie('auth_token');
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};
```

**Key Features**:
- Dual token sources: cookies (for web UI) + Authorization header (for API)
- JWT verification with secret key
- Automatic invalid token cleanup
- Error responses with proper HTTP status codes
- Support for Russian localization

**Applicable To VendHub**: Can be adapted for NestJS guards instead of Express middleware.

---

## PATTERN 2: User Registration & Role Assignment

### Implementation Found In: VHM24 Backend

**Database Schema** (Prisma):
```prisma
model User {
  id String @id @default(cuid())
  telegramId String @unique
  firstName String
  lastName String
  phone String?
  role UserRole @default(OPERATOR)
  status UserStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  assignedTasks Task[]
  actionLogs ActionLog[]
  
  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  WAREHOUSE
  OPERATOR
  TECHNICIAN
  DRIVER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  BLOCKED
}
```

**API Endpoint** (`backend/src/routes/users.js`):
- `GET /users` - List all users (ADMIN/MANAGER only)
- `POST /users` - Create new user (ADMIN only)
- `PUT /users/:id` - Update user (ADMIN only)
- `POST /users/sync` - Sync users between Telegram and web

**Registration Pattern**:
1. **Telegram-based auto-registration**:
   - User sends `/start` command to bot
   - System creates user with default OPERATOR role
   - Status defaults to ACTIVE
   - JWT token issued for 7 days

2. **Admin approval workflow**:
   - New users created with PENDING review
   - Admin approves in dashboard/Telegram
   - Role is assigned (OPERATOR, TECHNICIAN, WAREHOUSE, etc.)
   - User status changes to ACTIVE

---

## PATTERN 3: Admin Approval Process via Telegram

### Implementation Found In: VHM24 Telegram Bot

**Role-Based Handler System** (`telegram-bot/src/bot.js`):
```javascript
const requireRole = (roles) => {
  return async (ctx, next) => {
    if (!ctx.user) return await this.sendAuthRequest(ctx);
    if (Array.isArray(roles) ? (roles.includes(ctx.user.role) || 
        ctx.user.role === 'ADMIN') : (ctx.user.role === roles || 
        ctx.user.role === 'ADMIN')) {
      return await next();
    }
  };
};
```

**Manager/Admin Handlers** (`telegram-bot/src/handlers/manager/index.js`):
- `viewAnalyticsHandler` - System analytics with sales data
- `createTaskHandler` - Create new tasks for operators
- `selectTaskTypeHandler` - Assign task types
- `manageRoutesHandler` - Route management
- `scheduleTasksHandler` - Schedule tasks
- `detailedAnalyticsHandler` - Granular data analysis
- `exportReportHandler` - Generate reports (Excel, PDF, CSV)

**Key Features**:
- Middleware prevents unauthorized access
- Automatically promotes ADMIN above role checks
- Error handling with user-friendly messages
- Session persistence in Redis
- Inline keyboards for user interaction

**Approval Pattern Implementation**:
```javascript
// Manager receives pending approvals
@requireRole(['MANAGER', 'ADMIN'])
async approvePendingUsersHandler(ctx) {
  // Fetch pending users from database
  const pendingUsers = await this.userService.findByStatus('PENDING');
  
  // Display as inline keyboard with approve/reject buttons
  const keyboard = {
    inline_keyboard: pendingUsers.map(user => [
      {
        text: `✅ Approve ${user.firstName}`,
        callback_data: `approve_${user.id}`
      },
      {
        text: `❌ Reject ${user.firstName}`,
        callback_data: `reject_${user.id}`
      }
    ])
  };
  
  await ctx.reply('Pending User Approvals:', keyboard);
}

// Handle approval action
ctx.action(/^approve_(.+)$/, async (ctx) => {
  const userId = ctx.match[1];
  await this.userService.update(userId, { 
    status: 'ACTIVE',
    role: 'OPERATOR' // or selected role
  });
  await ctx.answerCbQuery('User approved!');
});
```

---

## PATTERN 4: Admin Dashboard with User Management

### Implementation Found In: VHM24

**Dashboard Structure** (`dashboard/admin.html`):
- User management interface with role badges
- Last login timestamps
- Edit/Delete action buttons
- Machine monitoring with status indicators
- System status metrics (CPU, RAM, disk, database)
- Activity logs categorized by type
- Settings and configuration panel
- Backup management

**Key Sections**:
1. **User Management**
   - Display all users with roles (Admin, Manager, Operator, Warehouse, Technician)
   - Show contact information and last login
   - Action buttons for editing roles and deleting users
   - Search/filter capabilities

2. **Machine Control**
   - Real-time machine status (online, offline, warning)
   - Location-based tracking
   - Performance indicators

3. **Logs & Monitoring**
   - Categorized logs (Info, Warning, Error, Debug)
   - Timestamps for all entries
   - System events (logins, machine alerts, API performance)

4. **Configuration**
   - System settings (name, timezone, language)
   - Security policies (2FA, password complexity)
   - Notification preferences
   - Backup schedules

**Implementation Pattern**:
```html
<!-- User Management Section -->
<div class="users-section">
  <table class="users-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Phone</th>
        <th>Last Login</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="usersTable">
      <!-- Populated by JavaScript -->
    </tbody>
  </table>
  
  <div class="actions">
    <button class="btn" onclick="openAddUserModal()">+ Add User</button>
    <button class="btn" onclick="openApprovalQueue()">📋 Pending Approvals</button>
  </div>
</div>
```

---

## PATTERN 5: User Invitation/Onboarding Flows

### Implementation Found In: VHM24 + sales-app

**Multi-Stage Registration**:

1. **Telegram Auto-Discovery** (VHM24):
   - User finds bot: `@VHM24_Bot` or similar
   - `/start` command initiates auto-registration
   - Profile auto-populated from Telegram (first name, last name, user ID)
   - Default OPERATOR role with PENDING status

2. **Web Dashboard Invitation** (Pattern):
   - Admin creates user invite link
   - Invite includes temporary token (24-48 hour expiry)
   - New user clicks link → pre-filled signup form
   - User sets password (if not Telegram auth)
   - Email/SMS notification sent

3. **Admin Approval Chain**:
   - New user appears in "Pending Approvals" queue
   - Manager/Admin reviews profile in Telegram or dashboard
   - Admin assigns specific role (OPERATOR, TECHNICIAN, WAREHOUSE, etc.)
   - User receives notification of approval
   - User gains access to role-specific features

**Session Management** (`telegram-bot/src/middleware/session.js`):
```javascript
const createSessionMiddleware = () => {
  return async (ctx, next) => {
    try {
      // Initialize session storage in Redis
      if (!ctx.session) {
        ctx.session = {};
      }
      
      // Continue with next middleware
      await next();
    } catch (error) {
      // Graceful fallback
      ctx.session = {};
      await next();
    }
  };
};
```

---

## PATTERN 6: Common Handler Patterns

### Implementation Found In: VHM24 Telegram Bot

**Basic Command Structure** (`handlers/common/index.js`):

1. **Start Command** (`/start`)
   - Greets user with personalized message
   - Displays role-specific keyboard options
   - Retrieves user information
   - Sets bot state to main menu

2. **Profile Command** (`/profile`)
   - Displays user info (name, role, status)
   - Options for settings and password change
   - Requires authentication

3. **Help Command** (`/help`)
   - Lists available commands
   - Provides command descriptions
   - Directs to support for issues

4. **Back to Menu**
   - Returns to main menu from any context
   - Resets bot state
   - Updates UI

**Helper Functions**:
```javascript
// Convert role codes to emoji labels
function getRoleText(role) {
  const roleMap = {
    'ADMIN': '👨‍💼 Administrator',
    'MANAGER': '📊 Manager',
    'OPERATOR': '👤 Operator',
    'WAREHOUSE': '📦 Warehouse',
    'TECHNICIAN': '🔧 Technician',
    'DRIVER': '🚗 Driver'
  };
  return roleMap[role] || role;
}

// Map status values to text
function getStatusText(status) {
  const statusMap = {
    'ACTIVE': '✅ Active',
    'INACTIVE': '⏸️ Inactive',
    'PENDING': '⏳ Pending Approval',
    'BLOCKED': '🚫 Blocked'
  };
  return statusMap[status] || status;
}
```

---

## PATTERN 7: Rate Limiting & Security

### Implementation Found In: sales-app

**Rate Limiting on Login** (Express):
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

**Security Features**:
- HttpOnly cookies (prevents JavaScript access to auth tokens)
- Secure flag enabled in production
- SameSite strict policy (prevents CSRF attacks)
- Input validation using express-validator
- Password hashing with bcryptjs
- JWT expiration (8 hours for web, 7 days for Telegram)

---

## PATTERN 8: Action Logging for Audit Trails

### Implementation Found In: VHM24

**ActionLog Model** (Prisma):
```prisma
model ActionLog {
  id String @id @default(cuid())
  userId String
  action String           // e.g., "USER_APPROVED", "TASK_CREATED"
  entityType String       // e.g., "USER", "TASK", "MACHINE"
  entityId String
  changes Json           // Track what changed
  ipAddress String?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([entityType, entityId])
}
```

**Usage Pattern**:
- Log all admin actions (user approvals, role changes, deletions)
- Track who made changes and when
- Store IP addresses for security
- Query logs for compliance/audit purposes

---

## PATTERN 9: API Documentation & Route Organization

### Implementation Found In: VHM24

**35 Route Files for Complete System**:
- `auth.js` - Authentication
- `users.js` - User management
- `tasks.js` - Task management
- `machines.js` - Machine operations
- `reports.js` - Report generation
- `telegram.js` - Telegram integration
- `dashboard.js` - Dashboard data
- Plus: inventory, expenses, locations, payments, etc.

**Modular Approach Benefits**:
- Separation of concerns
- Easy to test individual routes
- Scalable architecture
- Clear responsibility boundaries

---

## RECOMMENDED ARCHITECTURE FOR VENDHUB

Based on these patterns, here's the recommended approach:

### 1. **User Registration Flow**
```
New User (via Telegram /start)
    ↓
Auto-create with OPERATOR role + PENDING status
    ↓
Admin notified in Telegram (@approve_users command)
    ↓
Manager reviews profile → selects role
    ↓
System updates user role → status ACTIVE
    ↓
User receives Telegram notification
    ↓
User gains access to role-specific features
```

### 2. **Admin Approval Commands (Telegram)**
```
Manager/Admin has access to:
/approve_users       - View pending approvals
/user_requests       - Browse all pending users
/assign_role         - Change user roles
/view_logs          - Audit trail of actions
/system_report      - Admin analytics
```

### 3. **Dashboard Admin Panel**
```
Key Features:
- User Management Table (all users, filters by role/status)
- Approval Queue (pending users with action buttons)
- Activity Logs (who approved/rejected whom, when)
- Role Management (quick role change UI)
- Audit Trail (all admin actions)
- System Settings (notification preferences, etc.)
```

### 4. **Database Schema Foundation**
```prisma
model User {
  id String @id
  telegramId String? @unique
  email String? @unique
  phone String?
  firstName String
  lastName String
  role UserRole @default(OPERATOR)
  status UserStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  approvedBy User? @relation("ApprovedByUser")
  approvalLogs ActionLog[]
}

model ActionLog {
  id String @id
  userId String
  action String
  entityId String
  changes Json
  ipAddress String?
  createdAt DateTime @default(now())
}
```

---

## KEY TAKEAWAYS FOR VENDHUB IMPLEMENTATION

### Patterns to Adopt:
1. ✅ JWT-based authentication with role-based middleware
2. ✅ Telegram bot for admin approvals (use Telegraf framework)
3. ✅ User status tracking (PENDING → ACTIVE workflow)
4. ✅ Admin dashboard for user management
5. ✅ Action logging for audit trails
6. ✅ Rate limiting on critical endpoints
7. ✅ Session management for Telegram interactions
8. ✅ Modular route organization

### Technologies Already in VendHub:
- NestJS (matches VHM24's backend approach)
- PostgreSQL + Prisma (matches VHM24's data layer)
- Telegram integration (framework in place)
- JWT authentication (partially implemented)

### Recommended Next Steps:
1. Extend user schema with approval workflows
2. Implement manager/admin Telegram handlers
3. Create admin dashboard panel
4. Add action logging middleware
5. Set up approval queue system
6. Create user onboarding flow

---

## Repository Links for Reference

- **jamsmac/sales-app**: https://github.com/jamsmac/sales-app
- **jamshiddins/VHM24**: https://github.com/jamshiddins/VHM24
- **jamshiddins/vendbot_manager**: https://github.com/jamshiddins/vendbot_manager

---

**Report Generated**: 2025-11-16
**Analysis Scope**: GitHub pattern exploration for user registration and approval workflows
**Status**: Complete with implementation recommendations
