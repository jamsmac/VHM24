CREATE TABLE `accessRequestAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessRequestId` int NOT NULL,
	`action` enum('approved','rejected') NOT NULL,
	`performedBy` int NOT NULL,
	`performedByName` varchar(255),
	`assignedRole` enum('operator','manager','admin'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accessRequestAuditLogs_id` PRIMARY KEY(`id`)
);
