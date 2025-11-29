CREATE TABLE `accessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`username` varchar(255),
	`firstName` varchar(255),
	`lastName` varchar(255),
	`chatId` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestedRole` enum('operator','manager') NOT NULL DEFAULT 'operator',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accessRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `accessRequests_telegramId_unique` UNIQUE(`telegramId`)
);
