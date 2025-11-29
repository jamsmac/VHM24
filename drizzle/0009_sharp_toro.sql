ALTER TABLE `machines` MODIFY COLUMN `status` enum('active','maintenance','offline','retired') NOT NULL DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE `machines` ADD `type` varchar(100);--> statement-breakpoint
ALTER TABLE `machines` ADD `qrCode` text;--> statement-breakpoint
ALTER TABLE `machines` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `machines` ADD `installationDate` timestamp;--> statement-breakpoint
ALTER TABLE `machines` ADD `notes` text;