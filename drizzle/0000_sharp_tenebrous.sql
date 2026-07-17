CREATE TABLE `ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`headline` text NOT NULL,
	`angle` text NOT NULL,
	`source_item_ids` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ideas_day_unique` ON `ideas` (`day`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`original_excerpt` text,
	`translated_title` text,
	`translated_excerpt` text,
	`url` text NOT NULL,
	`published_at` text,
	`language` text,
	`topic` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`is_saved` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_url_unique` ON `items` (`url`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_synced_at` text,
	`last_error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_url_unique` ON `sources` (`url`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
