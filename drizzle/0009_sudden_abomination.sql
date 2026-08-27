CREATE TABLE `match_media` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`public_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`thumbnail_url` text,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_media_match_idx` ON `match_media` (`match_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `match_players` ADD `paid_at` integer;