CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account` text NOT NULL,
	`account_normalized` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer DEFAULT 100000 NOT NULL,
	`nickname` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_key` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_account_normalized_unique` ON `users` (`account_normalized`);
--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_key` text NOT NULL,
	`action` text NOT NULL,
	`succeeded` integer DEFAULT false NOT NULL,
	`attempted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `daily_reading_activity` (
	`user_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`day` text NOT NULL,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	`last_heartbeat_at` text NOT NULL,
	`counted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_item_states` (
	`user_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`is_saved` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `sources` ADD `contributor_user_id` integer REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `subscription_requests` ADD `requester_user_id` integer REFERENCES users(id);
--> statement-breakpoint
CREATE INDEX `auth_attempts_key_idx` ON `auth_attempts` (`attempt_key`,`action`,`attempted_at`);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE INDEX `reading_day_idx` ON `daily_reading_activity` (`day`,`user_id`);
--> statement-breakpoint
CREATE INDEX `sources_contributor_idx` ON `sources` (`contributor_user_id`,`created_at`);
