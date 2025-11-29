CREATE TABLE `componentHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentId` int NOT NULL,
	`eventType` enum('installation','removal','repair','maintenance','purchase') NOT NULL,
	`machineId` int,
	`performedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `componentHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialNumber` varchar(100) NOT NULL,
	`type` varchar(100) NOT NULL,
	`model` varchar(100),
	`status` enum('operational','maintenance','repair','retired') NOT NULL DEFAULT 'operational',
	`currentMachineId` int,
	`installationDate` timestamp,
	`nextServiceDue` timestamp,
	`healthScore` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `components_id` PRIMARY KEY(`id`),
	CONSTRAINT `components_serialNumber_unique` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`level` enum('warehouse','operator','machine') NOT NULL,
	`locationId` int,
	`quantity` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`serialNumber` varchar(100),
	`model` varchar(100),
	`location` text NOT NULL,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`status` enum('online','offline','maintenance') NOT NULL DEFAULT 'offline',
	`lastMaintenance` timestamp,
	`nextServiceDue` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machines_id` PRIMARY KEY(`id`),
	CONSTRAINT `machines_serialNumber_unique` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(100),
	`category` varchar(100),
	`unit` varchar(50) NOT NULL,
	`costPrice` int NOT NULL,
	`sellingPrice` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `stockTransfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`quantity` int NOT NULL,
	`priority` enum('low','normal','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stockTransfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`assignedTo` int,
	`type` enum('refill','maintenance','cleaning') NOT NULL,
	`status` enum('pending','in_progress','completed','rejected') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','urgent') NOT NULL DEFAULT 'normal',
	`description` text,
	`beforePhotoUrl` text,
	`afterPhotoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`amount` int NOT NULL,
	`paymentMethod` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager','operator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `telegramId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;