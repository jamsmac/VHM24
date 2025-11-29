import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, mysqlEnum, varchar, text, timestamp, index, boolean, decimal } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const accessRequestAuditLogs = mysqlTable("accessRequestAuditLogs", {
	id: int().autoincrement().notNull(),
	accessRequestId: int().notNull(),
	action: mysqlEnum(['approved','rejected']).notNull(),
	performedBy: int().notNull(),
	performedByName: varchar({ length: 255 }),
	assignedRole: mysqlEnum(['operator','manager','admin']),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const accessRequests = mysqlTable("accessRequests", {
	id: int().autoincrement().notNull(),
	telegramId: varchar({ length: 64 }).notNull(),
	username: varchar({ length: 255 }),
	firstName: varchar({ length: 255 }),
	lastName: varchar({ length: 255 }),
	chatId: varchar({ length: 64 }).notNull(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	requestedRole: mysqlEnum(['operator','manager']).default('operator').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	adminNotes: text(),
	email: varchar({ length: 320 }),
},
(table) => [
	index("accessRequests_telegramId_unique").on(table.telegramId),
]);

export const componentHistory = mysqlTable("componentHistory", {
	id: int().autoincrement().notNull(),
	componentId: int().notNull(),
	eventType: mysqlEnum(['installation','removal','repair','maintenance','purchase']).notNull(),
	machineId: int(),
	performedBy: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const components = mysqlTable("components", {
	id: int().autoincrement().notNull(),
	serialNumber: varchar({ length: 100 }).notNull(),
	type: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	status: mysqlEnum(['operational','maintenance','repair','retired']).default('operational').notNull(),
	currentMachineId: int(),
	installationDate: timestamp({ mode: 'string' }),
	nextServiceDue: timestamp({ mode: 'string' }),
	healthScore: int().default(100),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("components_serialNumber_unique").on(table.serialNumber),
]);

export const digestConfig = mysqlTable("digestConfig", {
	id: int().autoincrement().notNull(),
	enabled: boolean().default(true).notNull(),
	frequency: mysqlEnum(['daily','weekly']).default('daily').notNull(),
	recipients: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const inventory = mysqlTable("inventory", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	level: mysqlEnum(['warehouse','operator','machine']).notNull(),
	locationId: int(),
	quantity: int().default(0).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const inventoryAdjustments = mysqlTable("inventoryAdjustments", {
	id: int().autoincrement().notNull(),
	inventoryId: int().notNull(),
	productId: int().notNull(),
	adjustmentType: mysqlEnum(['damage','shrinkage','correction','found','expired','returned']).notNull(),
	quantityBefore: int().notNull(),
	quantityAfter: int().notNull(),
	quantityChange: int().notNull(),
	reason: text().notNull(),
	photoUrl: text(),
	performedBy: int().notNull(),
	performedByName: varchar({ length: 255 }),
	level: mysqlEnum(['warehouse','operator','machine']).notNull(),
	locationId: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const machines = mysqlTable("machines", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	serialNumber: varchar({ length: 100 }).notNull(),
	model: varchar({ length: 100 }),
	location: text().notNull(),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	status: mysqlEnum(['active','maintenance','offline','retired']).default('offline').notNull(),
	lastMaintenance: timestamp({ mode: 'string' }),
	nextServiceDue: timestamp({ mode: 'string' }),
	totalRevenue: int().default(0).notNull(),
	totalSales: int().default(0).notNull(),
	photo: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("machines_serialNumber_unique").on(table.serialNumber),
]);

export const products = mysqlTable("products", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	sku: varchar({ length: 100 }),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 50 }).notNull(),
	costPrice: int().notNull(),
	sellingPrice: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("products_sku_unique").on(table.sku),
]);

export const roleChanges = mysqlTable("roleChanges", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	oldRole: mysqlEnum(['user','operator','manager','admin']).notNull(),
	newRole: mysqlEnum(['user','operator','manager','admin']).notNull(),
	changedBy: int().notNull(),
	changedByName: varchar({ length: 255 }),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const stockTransfers = mysqlTable("stockTransfers", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	requestedBy: int().notNull(),
	quantity: int().notNull(),
	priority: mysqlEnum(['low','normal','urgent']).default('normal').notNull(),
	status: mysqlEnum(['pending','approved','rejected','completed']).default('pending').notNull(),
	notes: text(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	fromLevel: mysqlEnum(['warehouse','operator','machine']),
	toLevel: mysqlEnum(['warehouse','operator','machine']),
	fromLocationId: int(),
	toLocationId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const suppliers = mysqlTable("suppliers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	contactPerson: varchar({ length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const tasks = mysqlTable("tasks", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	assignedTo: int(),
	type: mysqlEnum(['refill','maintenance','cleaning']).notNull(),
	status: mysqlEnum(['pending','in_progress','completed','rejected']).default('pending').notNull(),
	priority: mysqlEnum(['low','normal','urgent']).default('normal').notNull(),
	description: text(),
	beforePhotoUrl: text(),
	afterPhotoUrl: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const transactions = mysqlTable("transactions", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	productId: int().notNull(),
	quantity: int().default(1).notNull(),
	amount: int().notNull(),
	paymentMethod: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','manager','operator']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	telegramId: varchar({ length: 64 }),
	twoFactorEnabled: boolean().default(false).notNull(),
	emailNotifications: boolean().default(true).notNull(),
	telegramNotifications: boolean().default(true).notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export const taskPhotos = mysqlTable("taskPhotos", {
	id: int().autoincrement().notNull(),
	taskId: int().notNull(),
	photoUrl: text().notNull(),
	photoType: mysqlEnum(['before','after']).notNull(),
	fileSize: int(),
	fileMimeType: varchar({ length: 100 }),
	validationStatus: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	validatedBy: int(),
	validationNotes: text(),
	uploadedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	validatedAt: timestamp({ mode: 'string' }),
});

export const inventoryAuditTrail = mysqlTable("inventoryAuditTrail", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	productId: int(),
	quantityBefore: int(),
	quantityAfter: int(),
	quantityChange: int().notNull(),
	operationType: mysqlEnum(['refill','removal','adjustment','inventory_count']).notNull(),
	operator: int().notNull(),
	operatorName: varchar({ length: 255 }),
	taskId: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineConnectivity = mysqlTable("machineConnectivity", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	status: mysqlEnum(['online','offline']).notNull(),
	lastHeartbeat: timestamp({ mode: 'string' }),
	offlineSince: timestamp({ mode: 'string' }),
	incidentCreated: boolean().default(false).notNull(),
	incidentId: int(),
	checkedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const incidents = mysqlTable("incidents", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	incidentType: mysqlEnum(['offline','malfunction','low_stock','temperature_alert','payment_error']).notNull(),
	status: mysqlEnum(['open','in_progress','resolved','closed']).default('open').notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	description: text(),
	detectedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	assignedTo: int(),
	resolvedAt: timestamp({ mode: 'string' }),
	resolutionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// AI-Agent System Tables
export const aiAgents = mysqlTable("aiAgents", {
  id: int().autoincrement().primaryKey(),
  referenceBookType: varchar({ length: 50 }).notNull().unique(),
  displayName: varchar({ length: 255 }).notNull(),
  systemPrompt: text().notNull(),
  status: mysqlEnum(['active', 'inactive', 'archived']).default('active').notNull(),
  version: int().default(1),
  createdBy: int().notNull(),
  updatedBy: int(),
  createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
});

export const aiSuggestions = mysqlTable("aiSuggestions", {
  id: int().autoincrement().primaryKey(),
  agentId: int().notNull(),
  referenceBookId: int(),
  inputData: text().notNull(),
  suggestedFields: text().notNull(),
  confidence: decimal({ precision: 3, scale: 2 }),
  confirmed: boolean().default(false),
  confirmedBy: int(),
  confirmedAt: timestamp({ mode: 'string' }),
  rejectedReason: text(),
  createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const aiImprovements = mysqlTable("aiImprovements", {
  id: int().autoincrement().primaryKey(),
  agentId: int().notNull(),
  proposedPrompt: text().notNull(),
  proposedChanges: text().notNull(),
  reasoning: text(),
  status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const aiLearningData = mysqlTable("aiLearningData", {
  id: int().autoincrement().primaryKey(),
  agentId: int().notNull(),
  fieldName: varchar({ length: 100 }),
  inputPattern: varchar({ length: 255 }),
  suggestedValue: varchar({ length: 255 }),
  confirmationRate: decimal({ precision: 3, scale: 2 }),
  rejectionRate: decimal({ precision: 3, scale: 2 }),
  lastUsed: timestamp({ mode: 'string' }),
});

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	type: mysqlEnum(['transfer_approved','transfer_rejected','low_stock','task_assigned','system']).notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	relatedId: int(),
	relatedType: varchar({ length: 50 }),
	read: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Type exports for database operations
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

export type AccessRequestAuditLog = typeof accessRequestAuditLogs.$inferSelect;
export type InsertAccessRequestAuditLog = typeof accessRequestAuditLogs.$inferInsert;

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type StockTransfer = typeof stockTransfers.$inferSelect;
export type InsertStockTransfer = typeof stockTransfers.$inferInsert;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InsertInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
