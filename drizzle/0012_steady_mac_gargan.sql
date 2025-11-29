ALTER TABLE `accessRequests` DROP INDEX `accessRequests_telegramId_unique`;--> statement-breakpoint
ALTER TABLE `components` DROP INDEX `components_serialNumber_unique`;--> statement-breakpoint
ALTER TABLE `machines` DROP INDEX `machines_serialNumber_unique`;--> statement-breakpoint
ALTER TABLE `products` DROP INDEX `products_sku_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `accessRequestAuditLogs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `accessRequests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `componentHistory` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `components` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `digestConfig` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `inventory` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `machines` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `products` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `roleChanges` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `stockTransfers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `suppliers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `tasks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `transactions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `accessRequestAuditLogs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `accessRequests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `componentHistory` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `components` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `digestConfig` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `machines` MODIFY COLUMN `status` enum('online','offline','maintenance') NOT NULL DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE `machines` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `roleChanges` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `stockTransfers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
CREATE INDEX `accessRequests_telegramId_unique` ON `accessRequests` (`telegramId`);--> statement-breakpoint
CREATE INDEX `components_serialNumber_unique` ON `components` (`serialNumber`);--> statement-breakpoint
CREATE INDEX `machines_serialNumber_unique` ON `machines` (`serialNumber`);--> statement-breakpoint
CREATE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
ALTER TABLE `machines` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `machines` DROP COLUMN `qrCode`;--> statement-breakpoint
ALTER TABLE `machines` DROP COLUMN `photoUrl`;--> statement-breakpoint
ALTER TABLE `machines` DROP COLUMN `installationDate`;--> statement-breakpoint
ALTER TABLE `machines` DROP COLUMN `notes`;