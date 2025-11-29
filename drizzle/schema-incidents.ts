import { int, mysqlEnum, mysqlTable, text, timestamp } from "drizzle-orm/mysql-core";

export const incidents = mysqlTable("incidents", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	incidentType: mysqlEnum(['offline','malfunction','low_stock','temperature_alert','payment_error']).notNull(),
	status: mysqlEnum(['open','in_progress','resolved','closed']).default('open').notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	description: text(),
	detectedAt: timestamp({ mode: 'string' }).notNull(),
	assignedTo: int(),
	resolvedAt: timestamp({ mode: 'string' }),
	resolutionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
});
