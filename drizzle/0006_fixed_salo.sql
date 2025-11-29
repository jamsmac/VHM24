CREATE TABLE `roleChanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`oldRole` enum('user','operator','manager','admin') NOT NULL,
	`newRole` enum('user','operator','manager','admin') NOT NULL,
	`changedBy` int NOT NULL,
	`changedByName` varchar(255),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roleChanges_id` PRIMARY KEY(`id`)
);
