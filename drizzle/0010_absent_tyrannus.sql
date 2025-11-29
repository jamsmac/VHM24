CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`incidentType` enum('offline','malfunction','low_stock','temperature_alert','payment_error') NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`description` text,
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`assignedTo` int,
	`resolvedAt` timestamp,
	`resolutionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `inventoryAuditTrail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`productId` int,
	`quantityBefore` int,
	`quantityAfter` int,
	`quantityChange` int NOT NULL,
	`operationType` enum('refill','removal','adjustment','inventory_count') NOT NULL,
	`operator` int NOT NULL,
	`operatorName` varchar(255),
	`taskId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `machineConnectivity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`status` enum('online','offline') NOT NULL,
	`lastHeartbeat` timestamp,
	`offlineSince` timestamp,
	`incidentCreated` boolean NOT NULL DEFAULT false,
	`incidentId` int,
	`checkedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `taskPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoType` enum('before','after') NOT NULL,
	`fileSize` int,
	`fileMimeType` varchar(100),
	`validationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`validatedBy` int,
	`validationNotes` text,
	`uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`validatedAt` timestamp
);
