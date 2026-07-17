CREATE TABLE `subscription_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_requests_query_unique` ON `subscription_requests` (`query`);--> statement-breakpoint
ALTER TABLE `sources` ADD `kind` text DEFAULT 'rss' NOT NULL;