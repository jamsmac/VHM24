ALTER TABLE `users` ADD `emailNotifications` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `telegramNotifications` boolean DEFAULT true NOT NULL;