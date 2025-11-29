import { eq, desc, and, sql, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, machines, products, inventory, inventoryAdjustments, tasks, 
  components, componentHistory, transactions, suppliers, stockTransfers,
  accessRequests, InsertAccessRequest, accessRequestAuditLogs, InsertAccessRequestAuditLog,
  roleChanges, digestConfig, InsertInventoryAdjustment, notifications
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "telegramId"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.twoFactorEnabled !== undefined) {
      values.twoFactorEnabled = user.twoFactorEnabled;
      updateSet.twoFactorEnabled = user.twoFactorEnabled;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Machines
export async function getAllMachines() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(machines).orderBy(desc(machines.createdAt));
}

export async function getMachineById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
  return result[0] || null;
}

// Products
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).orderBy(desc(products.createdAt));
}

// Inventory
export async function getInventoryByLevel(
  level?: "warehouse" | "operator" | "machine",
  locationId?: number
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  if (level) {
    conditions.push(eq(inventory.level, level));
  }
  if (locationId !== undefined) {
    conditions.push(eq(inventory.locationId, locationId));
  }
  
  if (conditions.length > 0) {
    return await db.select().from(inventory).where(and(...conditions));
  }
  
  return await db.select().from(inventory);
}

export async function getInventoryWithProducts(level: "warehouse" | "operator" | "machine") {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      level: inventory.level,
      locationId: inventory.locationId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
      productName: products.name,
      productSku: products.sku,
      productUnit: products.unit,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.level, level));
  
  return result;
}

// Tasks
export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function getTasksByStatus(status: "pending" | "in_progress" | "completed" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.status, status)).orderBy(desc(tasks.createdAt));
}

// Components
export async function getAllComponents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(components).orderBy(desc(components.createdAt));
}

export async function getComponentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(components).where(eq(components.id, id)).limit(1);
  return result[0] || null;
}

export async function getComponentHistory(componentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(componentHistory)
    .where(eq(componentHistory.componentId, componentId))
    .orderBy(desc(componentHistory.createdAt));
}

// Transactions
export async function getRecentTransactions(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit);
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.createdAt, startDate.toISOString()),
        sql`${transactions.createdAt} <= ${endDate.toISOString()}`
      )
    )
    .orderBy(desc(transactions.createdAt));
}

// Dashboard Analytics
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const revenueResult = await db
    .select({ total: sql<number>`SUM(${transactions.amount})` })
    .from(transactions)
    .where(gte(transactions.createdAt, sevenDaysAgo.toISOString()));

  const machineStats = await db
    .select({
      status: machines.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(machines)
    .groupBy(machines.status);

  const pendingTasksResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(eq(tasks.status, "pending"));

  return {
    totalRevenue: revenueResult[0]?.total || 0,
    machineStats: machineStats.reduce((acc, stat) => {
      acc[stat.status] = Number(stat.count);
      return acc;
    }, {} as Record<string, number>),
    pendingTasks: Number(pendingTasksResult[0]?.count || 0),
  };
}

// Suppliers
export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
}

// Stock Transfers
export async function getAllStockTransfers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stockTransfers).orderBy(desc(stockTransfers.createdAt));
}

export async function createStockTransfer(data: {
  productId: number;
  requestedBy: number;
  quantity: number;
  priority: "low" | "normal" | "urgent";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(stockTransfers).values(data);
}

// Access Requests
export async function createAccessRequest(data: InsertAccessRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(accessRequests).values(data);
  return result;
}

export async function getAllAccessRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt));
}

export async function getPendingAccessRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accessRequests).where(eq(accessRequests.status, "pending")).orderBy(desc(accessRequests.createdAt));
}

export async function getAccessRequestByTelegramId(telegramId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(accessRequests).where(eq(accessRequests.telegramId, telegramId)).limit(1);
  return result[0] || null;
}

export async function approveAccessRequest(id: number, approvedBy: number, role?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status: "approved", approvedBy, approvedAt: new Date().toISOString() };
  if (role) {
    updateData.requestedRole = role;
  }
  
  await db.update(accessRequests)
    .set(updateData)
    .where(eq(accessRequests.id, id));
  
  // Create audit log entry
  await createAuditLog({
    accessRequestId: id,
    action: "approved",
    performedBy: approvedBy,
    assignedRole: role as "operator" | "manager" | "admin" | undefined,
  });
}

export async function rejectAccessRequest(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(accessRequests)
    .set({ status: "rejected", approvedBy, approvedAt: new Date().toISOString() })
    .where(eq(accessRequests.id, id));
  
  // Create audit log entry
  await createAuditLog({
    accessRequestId: id,
    action: "rejected",
    performedBy: approvedBy,
  });
}

export async function createAuditLog(log: Omit<InsertAccessRequestAuditLog, "id" | "createdAt" | "performedByName">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get performer's name from users table
  const performer = await db.select({ name: users.name }).from(users).where(eq(users.id, log.performedBy)).limit(1);
  const performedByName = performer[0]?.name || "Unknown";
  
  await db.insert(accessRequestAuditLogs).values({
    accessRequestId: log.accessRequestId,
    action: log.action,
    performedBy: log.performedBy,
    performedByName,
    assignedRole: log.assignedRole,
    notes: log.notes,
  });
}

export async function getAuditLogsByRequestId(accessRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(accessRequestAuditLogs)
    .where(eq(accessRequestAuditLogs.accessRequestId, accessRequestId))
    .orderBy(desc(accessRequestAuditLogs.createdAt));
}

export async function getAllAuditLogs(startDate?: string, endDate?: string, actionType?: "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(accessRequestAuditLogs);
  const conditions: any[] = [];
  
  // Apply date filtering if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    conditions.push(
      gte(accessRequestAuditLogs.createdAt, start.toISOString()),
      sql`${accessRequestAuditLogs.createdAt} <= ${end.toISOString()}`
    );
  } else if (startDate) {
    const start = new Date(startDate);
    conditions.push(gte(accessRequestAuditLogs.createdAt, start.toISOString()));
  } else if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(sql`${accessRequestAuditLogs.createdAt} <= ${end.toISOString()}`);
  }
  
  // Apply action type filtering if provided
  if (actionType) {
    conditions.push(eq(accessRequestAuditLogs.action, actionType));
  }
  
  // Apply all conditions if any exist
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(accessRequestAuditLogs.createdAt));
}

/**
 * Create a role change log entry
 */
export async function createRoleChange(
  userId: number,
  userName: string | null,
  oldRole: string,
  newRole: string,
  changedBy: number,
  changedByName: string | null,
  reason?: string
) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(roleChanges).values({
    userId,
    userName,
    oldRole: oldRole as any,
    newRole: newRole as any,
    changedBy,
    changedByName,
    reason,
  });
  
  return result;
}

/**
 * Get all role changes
 */
export async function getAllRoleChanges() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(roleChanges).orderBy(desc(roleChanges.createdAt));
}

/**
 * Get role changes for a specific user
 */
export async function getRoleChangesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(roleChanges)
    .where(eq(roleChanges.userId, userId))
    .orderBy(desc(roleChanges.createdAt));
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] || null;
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, newRole: string) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(users)
    .set({ role: newRole as any })
    .where(eq(users.id, userId));
  
  return true;
}

/**
 * Get all users
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

/**
 * Get digest configuration
 */
export async function getDigestConfig() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(digestConfig).limit(1);
  return result[0] || null;
}

/**
 * Update digest configuration
 */
export async function updateDigestConfig(config: {
  enabled: boolean;
  frequency: "daily" | "weekly";
  recipients: string[];
}) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getDigestConfig();
  const recipientsJson = JSON.stringify(config.recipients);
  
  if (existing) {
    await db.update(digestConfig)
      .set({
        enabled: config.enabled,
        frequency: config.frequency,
        recipients: recipientsJson,
      })
      .where(eq(digestConfig.id, existing.id));
  } else {
    await db.insert(digestConfig).values({
      enabled: config.enabled,
      frequency: config.frequency,
      recipients: recipientsJson,
    });
  }
  
  return true;
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: number,
  emailNotifications: boolean,
  telegramNotifications: boolean
) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(users)
    .set({ emailNotifications, telegramNotifications })
    .where(eq(users.id, userId));
  
  return true;
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const user = await getUserById(userId);
  if (!user) return null;
  
  return {
    emailNotifications: user.emailNotifications,
    telegramNotifications: user.telegramNotifications,
  };
}




/**
 * Create a new machine
 */
export async function createMachine(data: {
  name: string;
  serialNumber: string;
  model?: string;
  type?: string;
  location: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machines).values({
    ...data,
    status: 'offline',
    totalRevenue: 0,
    totalSales: 0,
  });
  return result;
}

/**
 * Update a machine
 */
export async function updateMachineData(id: number, data: Partial<{
  name: string;
  model: string;
  type: string;
  location: string;
  latitude: string;
  longitude: string;
  status: 'active' | 'maintenance' | 'offline' | 'retired';
  lastMaintenance: Date;
  nextServiceDue: Date;
  photo: string;
  notes: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Convert Date objects to ISO strings for database storage
  const updateData: any = { ...data };
  if (data.lastMaintenance) {
    updateData.lastMaintenance = data.lastMaintenance.toISOString();
  }
  if (data.nextServiceDue) {
    updateData.nextServiceDue = data.nextServiceDue.toISOString();
  }
  
  return await db.update(machines).set({
    ...updateData,
    updatedAt: new Date().toISOString(),
  }).where(eq(machines.id, id));
}

/**
 * Delete a machine
 */
export async function deleteMachineData(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(machines).where(eq(machines.id, id));
}

/**
 * Get machines by status
 */
export async function getMachinesByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(machines).where(eq(machines.status, status as any));
}

/**
 * Update machine revenue
 */
export async function updateMachineRevenue(id: number, amount: number) {
  const db = await getDb();
  if (!db) return null;
  
  const machine = await getMachineById(id);
  if (!machine) return null;
  
  return await db.update(machines).set({
    totalRevenue: machine.totalRevenue + amount,
    totalSales: machine.totalSales + 1,
    updatedAt: new Date().toISOString(),
  }).where(eq(machines.id, id));
}



/**
 * Get user by Telegram ID
 */
export async function getUserByTelegramId(telegramId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users).where(eq(users.telegramId, telegramId));
  return result[0] || null;
}




// ============================================
// Additional Inventory Functions
// ============================================

/**
 * Get inventory by product across all levels
 */
export async function getInventoryByProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: inventory.id,
      level: inventory.level,
      locationId: inventory.locationId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .where(eq(inventory.productId, productId));
}

/**
 * Get all inventory with product details
 */
export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      productName: products.name,
      productSku: products.sku,
      productCategory: products.category,
      productUnit: products.unit,
      productCostPrice: products.costPrice,
      productSellingPrice: products.sellingPrice,
      level: inventory.level,
      locationId: inventory.locationId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .leftJoin(products, eq(products.id, inventory.productId))
    .orderBy(desc(inventory.updatedAt));
}

/**
 * Update inventory quantity
 */
export async function updateInventoryQuantity(id: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(inventory)
    .set({ quantity, updatedAt: new Date().toISOString() })
    .where(eq(inventory.id, id));
}

/**
 * Get low stock alerts (items below threshold)
 */
export async function getLowStockAlerts(threshold: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      productName: products.name,
      productSku: products.sku,
      level: inventory.level,
      locationId: inventory.locationId,
      quantity: inventory.quantity,
      threshold: sql<number>`${threshold}`,
    })
    .from(inventory)
    .leftJoin(products, eq(products.id, inventory.productId))
    .where(sql`${inventory.quantity} < ${threshold}`)
    .orderBy(inventory.quantity);
}

/**
 * Get stock transfers with optional status filter
 */
export async function getStockTransfers(status?: 'pending' | 'approved' | 'rejected' | 'completed') {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: stockTransfers.id,
      productId: stockTransfers.productId,
      productName: products.name,
      productSku: products.sku,
      requestedBy: stockTransfers.requestedBy,
      requesterName: users.name,
      quantity: stockTransfers.quantity,
      priority: stockTransfers.priority,
      status: stockTransfers.status,
      notes: stockTransfers.notes,
      createdAt: stockTransfers.createdAt,
      updatedAt: stockTransfers.updatedAt,
    })
    .from(stockTransfers)
    .leftJoin(products, eq(products.id, stockTransfers.productId))
    .leftJoin(users, eq(users.id, stockTransfers.requestedBy));

  if (status) {
    query = query.where(eq(stockTransfers.status, status)) as any;
  }

  return await query.orderBy(desc(stockTransfers.createdAt));
}

/**
 * Update stock transfer status
 */
export async function updateStockTransferStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected' | 'completed'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(stockTransfers)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(stockTransfers.id, id));
}

/**
 * Get inventory statistics
 */
export async function getInventoryStats() {
  const db = await getDb();
  if (!db) return null;

  // Total products
  const totalProducts = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${inventory.productId})` })
    .from(inventory);

  // Total quantity by level
  const warehouseQty = await db
    .select({ total: sql<number>`SUM(${inventory.quantity})` })
    .from(inventory)
    .where(eq(inventory.level, 'warehouse'));

  const operatorQty = await db
    .select({ total: sql<number>`SUM(${inventory.quantity})` })
    .from(inventory)
    .where(eq(inventory.level, 'operator'));

  const machineQty = await db
    .select({ total: sql<number>`SUM(${inventory.quantity})` })
    .from(inventory)
    .where(eq(inventory.level, 'machine'));

  // Low stock count
  const lowStockCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inventory)
    .where(sql`${inventory.quantity} < 10`);

  // Pending transfers
  const pendingTransfers = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(stockTransfers)
    .where(eq(stockTransfers.status, 'pending'));

  return {
    totalProducts: totalProducts[0]?.count || 0,
    warehouseQuantity: warehouseQty[0]?.total || 0,
    operatorQuantity: operatorQty[0]?.total || 0,
    machineQuantity: machineQty[0]?.total || 0,
    lowStockCount: lowStockCount[0]?.count || 0,
    pendingTransfers: pendingTransfers[0]?.count || 0,
  };
}


// Stock Transfer Approval Functions
export async function approveStockTransfer(transferId: number, approvedBy: number, approvedByName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Get transfer details
  const [transfer] = await db
    .select()
    .from(stockTransfers)
    .where(eq(stockTransfers.id, transferId));
  
  if (!transfer) {
    throw new Error("Transfer not found");
  }
  
  if (transfer.status !== "pending") {
    throw new Error("Transfer is not pending");
  }
  
  // Update transfer status
  await db
    .update(stockTransfers)
    .set({
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stockTransfers.id, transferId));
  
  // Automatic inventory updates if fromLevel and toLevel are specified
  if (transfer.fromLevel && transfer.toLevel) {
    // Get source inventory
    const [sourceInventory] = await db
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, transfer.productId),
        eq(inventory.level, transfer.fromLevel),
        transfer.fromLocationId ? eq(inventory.locationId, transfer.fromLocationId) : sql`1=1`
      ));
    
    // Get destination inventory
    const [destInventory] = await db
      .select()
      .from(inventory)
      .where(and(
        eq(inventory.productId, transfer.productId),
        eq(inventory.level, transfer.toLevel),
        transfer.toLocationId ? eq(inventory.locationId, transfer.toLocationId) : sql`1=1`
      ));
    
    if (sourceInventory && destInventory) {
      // Check if source has enough stock
      if (sourceInventory.quantity >= transfer.quantity) {
        // Decrement source
        await db
          .update(inventory)
          .set({
            quantity: sourceInventory.quantity - transfer.quantity,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(inventory.id, sourceInventory.id));
        
        // Increment destination
        await db
          .update(inventory)
          .set({
            quantity: destInventory.quantity + transfer.quantity,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(inventory.id, destInventory.id));
        
        // Update transfer status to completed
        await db
          .update(stockTransfers)
          .set({
            status: "completed",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(stockTransfers.id, transferId));
      }
    }
  }
  
  // Create notification for requester
  await createNotification({
    userId: transfer.requestedBy,
    type: "transfer_approved",
    title: "Transfer Request Approved",
    message: `Your transfer request for ${transfer.quantity} items has been approved by ${approvedByName}. Inventory has been updated.`,
    relatedId: transferId,
    relatedType: "transfer",
  });
  
  return { success: true, transfer };
}

export async function rejectStockTransfer(transferId: number, rejectedBy: number, rejectedByName: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Get transfer details
  const [transfer] = await db
    .select()
    .from(stockTransfers)
    .where(eq(stockTransfers.id, transferId));
  
  if (!transfer) {
    throw new Error("Transfer not found");
  }
  
  if (transfer.status !== "pending") {
    throw new Error("Transfer is not pending");
  }
  
  // Update transfer status
  await db
    .update(stockTransfers)
    .set({
      status: "rejected",
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      notes: reason || transfer.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stockTransfers.id, transferId));
  
  // Create notification for requester
  await createNotification({
    userId: transfer.requestedBy,
    type: "transfer_rejected",
    title: "Transfer Request Rejected",
    message: `Your transfer request for ${transfer.quantity} items has been rejected by ${rejectedByName}.${reason ? ` Reason: ${reason}` : ""}`,
    relatedId: transferId,
    relatedType: "transfer",
  });
  
  return { success: true, transfer };
}

export async function getPendingStockTransfers() {
  const db = await getDb();
  if (!db) return [];
  
  const transfers = await db
    .select({
      id: stockTransfers.id,
      productId: stockTransfers.productId,
      productName: products.name,
      productSku: products.sku,
      requestedBy: stockTransfers.requestedBy,
      requesterName: users.name,
      quantity: stockTransfers.quantity,
      priority: stockTransfers.priority,
      status: stockTransfers.status,
      notes: stockTransfers.notes,
      fromLevel: stockTransfers.fromLevel,
      toLevel: stockTransfers.toLevel,
      fromLocationId: stockTransfers.fromLocationId,
      toLocationId: stockTransfers.toLocationId,
      createdAt: stockTransfers.createdAt,
      updatedAt: stockTransfers.updatedAt,
    })
    .from(stockTransfers)
    .leftJoin(products, eq(stockTransfers.productId, products.id))
    .leftJoin(users, eq(stockTransfers.requestedBy, users.id))
    .where(eq(stockTransfers.status, "pending"))
    .orderBy(desc(stockTransfers.createdAt));
  
  return transfers;
}

// Inventory Adjustment Functions
export async function createInventoryAdjustment(data: {
  inventoryId: number;
  productId: number;
  adjustmentType: 'damage' | 'shrinkage' | 'correction' | 'found' | 'expired' | 'returned';
  quantityChange: number;
  reason: string;
  photoUrl?: string;
  performedBy: number;
  performedByName: string;
  level: 'warehouse' | 'operator' | 'machine';
  locationId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Get current inventory
  const [currentInventory] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, data.inventoryId));
  
  if (!currentInventory) {
    throw new Error("Inventory not found");
  }
  
  const quantityBefore = currentInventory.quantity;
  const quantityAfter = quantityBefore + data.quantityChange;
  
  if (quantityAfter < 0) {
    throw new Error("Adjustment would result in negative inventory");
  }
  
  // Create adjustment record
  const [adjustment] = await db
    .insert(inventoryAdjustments)
    .values({
      inventoryId: data.inventoryId,
      productId: data.productId,
      adjustmentType: data.adjustmentType,
      quantityBefore,
      quantityAfter,
      quantityChange: data.quantityChange,
      reason: data.reason,
      photoUrl: data.photoUrl,
      performedBy: data.performedBy,
      performedByName: data.performedByName,
      level: data.level,
      locationId: data.locationId,
    });
  
  // Update inventory quantity
  await db
    .update(inventory)
    .set({
      quantity: quantityAfter,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(inventory.id, data.inventoryId));
  
  return adjustment;
}

export async function getInventoryAdjustments(filters?: {
  productId?: number;
  level?: 'warehouse' | 'operator' | 'machine';
  adjustmentType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      id: inventoryAdjustments.id,
      inventoryId: inventoryAdjustments.inventoryId,
      productId: inventoryAdjustments.productId,
      productName: products.name,
      productSku: products.sku,
      adjustmentType: inventoryAdjustments.adjustmentType,
      quantityBefore: inventoryAdjustments.quantityBefore,
      quantityAfter: inventoryAdjustments.quantityAfter,
      quantityChange: inventoryAdjustments.quantityChange,
      reason: inventoryAdjustments.reason,
      photoUrl: inventoryAdjustments.photoUrl,
      performedBy: inventoryAdjustments.performedBy,
      performedByName: inventoryAdjustments.performedByName,
      level: inventoryAdjustments.level,
      locationId: inventoryAdjustments.locationId,
      createdAt: inventoryAdjustments.createdAt,
    })
    .from(inventoryAdjustments)
    .leftJoin(products, eq(inventoryAdjustments.productId, products.id))
    .orderBy(desc(inventoryAdjustments.createdAt));
  
  return await query;
}


// ============================================
// Notification Functions
// ============================================

/**
 * Create a new notification
 */
export async function createNotification(data: {
  userId: number;
  type: 'transfer_approved' | 'transfer_rejected' | 'low_stock' | 'task_assigned' | 'system';
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      read: 0,
    });
  
  return notification;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  return await query;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, 0)
    ));
  
  return result.length;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ));
  
  return { success: true };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, 0)
    ));
  
  return { success: true };
}


/**
 * Get users by role
 */
export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).where(eq(users.role, role as any));
}
