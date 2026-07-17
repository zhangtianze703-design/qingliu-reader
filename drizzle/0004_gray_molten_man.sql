ALTER TABLE `subscription_requests` ADD `kind` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_requests` ADD `last_error` text;--> statement-breakpoint
ALTER TABLE `subscription_requests` ADD `updated_at` text;