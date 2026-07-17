CREATE TABLE `user_source_follows` (
	`user_id` integer NOT NULL,
	`source_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `source_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT OR IGNORE INTO `user_source_follows` (`user_id`, `source_id`, `created_at`)
SELECT `users`.`id`, `sources`.`id`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `users` CROSS JOIN `sources`;--> statement-breakpoint
CREATE INDEX `user_source_follows_source_idx` ON `user_source_follows` (`source_id`, `user_id`);
