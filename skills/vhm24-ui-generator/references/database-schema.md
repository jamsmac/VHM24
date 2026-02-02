# VendHub Database Schema (Drizzle ORM)

## Table of Contents
1. [Core Tables](#core-tables)
2. [Inventory Tables](#inventory-tables)
3. [Business Tables](#business-tables)
4. [Enums Reference](#enums-reference)

---

## Core Tables

### users
```typescript
{
  id: int().autoincrement().primaryKey(),
  openId: varchar(64).unique(),
  name: text(),
  email: varchar(320),
  role: enum("user", "employee", "admin"),

  // Telegram
  telegramId: varchar(64).unique(),
  telegramUsername: varchar(64),
  telegramFirstName: varchar(128),

  // Loyalty
  pointsBalance: int().default(0),
  loyaltyLevel: enum("bronze", "silver", "gold", "platinum"),
  totalSpent: int().default(0),
  totalOrders: int().default(0),

  // Streak
  currentStreak: int().default(0),
  longestStreak: int().default(0),

  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().onUpdateNow(),
}
```

### machines
```typescript
{
  id: int().primaryKey(),
  machineCode: varchar(32).unique(),
  name: varchar(128),
  model: varchar(64),
  serialNumber: varchar(64),
  manufacturer: varchar(64),
  address: text(),
  latitude: decimal(10, 8),
  longitude: decimal(11, 8),
  groupId: int(),
  status: enum("online", "offline", "maintenance", "inactive"),
  installationDate: timestamp(),
  lastMaintenanceDate: timestamp(),
  assignedEmployeeId: int(),
  imageUrl: text(),
}
```

### products
```typescript
{
  id: int().primaryKey(),
  slug: varchar(64).unique(),
  name: varchar(128),
  nameRu: varchar(128),
  description: text(),
  descriptionRu: text(),
  category: enum("coffee", "tea", "snacks", "cold_drinks", "other"),
  price: int(), // in UZS
  imageUrl: text(),
  isAvailable: boolean().default(true),
  isPopular: boolean().default(false),
  calories: int(),
  volume: int(), // ml
}
```

### orders
```typescript
{
  id: int().primaryKey(),
  orderNumber: varchar(32).unique(),
  userId: int(),
  machineId: int(),

  items: json(), // [{productId, quantity, price, customizations}]
  subtotal: int(),
  discount: int().default(0),
  total: int(),

  paymentMethod: enum("click", "payme", "uzum", "telegram", "cash", "bonus"),
  paymentStatus: enum("pending", "paid", "failed", "refunded"),
  status: enum("pending", "confirmed", "preparing", "ready", "completed", "cancelled"),

  promoCode: varchar(32),
  promoDiscount: int(),
  pointsEarned: int().default(0),
  pointsUsed: int().default(0),

  completedAt: timestamp(),
}
```

---

## Inventory Tables

### employees
```typescript
{
  id: int().primaryKey(),
  fullName: varchar(128),
  phone: varchar(32),
  email: varchar(320),
  username: varchar(64),
  role: enum("platform_owner", "platform_admin", "org_owner", "org_admin",
             "manager", "supervisor", "operator", "technician", "collector",
             "warehouse_manager", "warehouse_worker", "accountant", "investor"),
  status: enum("pending", "active", "inactive", "suspended"),
  telegramUserId: varchar(64),
  hireDate: timestamp(),
  salary: int(),
}
```

### ingredients
```typescript
{
  id: int().primaryKey(),
  name: varchar(128),
  category: enum("coffee", "milk", "sugar", "syrup", "powder", "water", "other"),
  unit: varchar(32).default("g"),
  costPerUnit: int(),
  minStockLevel: int().default(100),
  isActive: boolean().default(true),
}
```

### bunkers
```typescript
{
  id: int().primaryKey(),
  machineId: int(),
  ingredientId: int(),
  bunkerNumber: int(),
  capacity: int(),
  currentLevel: int().default(0),
  lowLevelThreshold: int().default(20), // percentage
  lastRefillDate: timestamp(),
  lastRefillBy: int(), // employee ID
}
```

### warehouseInventory
```typescript
{
  id: int().primaryKey(),
  itemType: enum("ingredient", "cleaning", "spare_part", "other"),
  itemId: int(),
  quantity: int().default(0),
  location: varchar(64), // shelf/bin location
  lastStockCheck: timestamp(),
}
```

### stockMovements
```typescript
{
  id: int().primaryKey(),
  itemType: enum("ingredient", "cleaning", "spare_part"),
  itemId: int(),
  movementType: enum("in", "out", "adjustment", "transfer"),
  quantity: int(), // positive for in, negative for out
  reason: varchar(256),
  machineId: int(),
  employeeId: int(),
}
```

---

## Business Tables

### tasks
```typescript
{
  id: int().primaryKey(),
  title: varchar(256),
  description: text(),
  taskType: enum("maintenance", "refill", "cleaning", "repair", "inspection", "inventory", "other"),
  priority: enum("low", "medium", "high", "urgent"),
  status: enum("pending", "in_progress", "completed", "cancelled"),
  assignedTo: int(), // employee ID
  createdBy: int(),
  machineId: int(),
  dueDate: timestamp(),
  startedAt: timestamp(),
  completedAt: timestamp(),
  completionNotes: text(),
}
```

### machineAssignments
```typescript
{
  id: int().primaryKey(),
  machineId: int(),
  employeeId: int(),
  assignmentType: enum("primary", "secondary", "temporary"),
  assignmentStatus: enum("active", "inactive", "pending"),
  startDate: timestamp(),
  endDate: timestamp(),
  responsibilities: text(), // JSON array
  assignedBy: int(),
}
```

### workLogs
```typescript
{
  id: int().primaryKey(),
  employeeId: int(),
  machineId: int(),
  workType: enum("maintenance", "refill", "cleaning", "repair", "inspection", "installation", "other"),
  workStatus: enum("in_progress", "completed", "cancelled"),
  startTime: timestamp(),
  endTime: timestamp(),
  duration: int(), // minutes
  description: text(),
  issuesFound: text(), // JSON array
  partsUsed: text(), // JSON array
  photoUrls: text(), // JSON array
  rating: int(), // 1-5
  verifiedBy: int(),
}
```

### salesRecords
```typescript
{
  id: int().primaryKey(),
  orderNumber: varchar(64),
  productName: varchar(128),
  flavorName: varchar(128),
  orderResource: varchar(64), // Payment type: Наличные, QR, VIP
  machineCode: varchar(64),
  address: varchar(256),
  orderPrice: int(),
  brewingStatus: varchar(64),
  createdTime: timestamp(),
  paymentTime: timestamp(),
  importBatchId: varchar(64),
}
```

---

## Enums Reference

### Machine Status
```typescript
"online" | "offline" | "maintenance" | "inactive"
```

### Order Status
```typescript
"pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"
```

### Payment Status
```typescript
"pending" | "paid" | "failed" | "refunded"
```

### Payment Methods
```typescript
"click" | "payme" | "uzum" | "telegram" | "cash" | "bonus"
```

### Employee Roles
```typescript
"platform_owner" | "platform_admin" | "org_owner" | "org_admin" |
"manager" | "supervisor" | "operator" | "technician" | "collector" |
"warehouse_manager" | "warehouse_worker" | "accountant" | "investor"
```

### Task Priority
```typescript
"low" | "medium" | "high" | "urgent"
```

### Task Type
```typescript
"maintenance" | "refill" | "cleaning" | "repair" | "inspection" | "inventory" | "other"
```

### Loyalty Level
```typescript
"bronze" | "silver" | "gold" | "platinum"
```

### Product Category
```typescript
"coffee" | "tea" | "snacks" | "cold_drinks" | "other"
```
