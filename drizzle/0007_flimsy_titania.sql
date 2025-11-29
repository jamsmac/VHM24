CREATE TABLE `digestConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`frequency` enum('daily','weekly') NOT NULL DEFAULT 'daily',
	`recipients` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digestConfig_id` PRIMARY KEY(`id`)
);
