CREATE TABLE `match_players` (
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`slot` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`match_id`, `player_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_players_match_idx` ON `match_players` (`match_id`,`slot`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`played_at` integer NOT NULL,
	`location` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `matches_played_at_idx` ON `matches` (`played_at`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`area` text NOT NULL,
	`photo_url` text,
	`photo_public_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `players_last_name_idx` ON `players` (`last_name`,`first_name`);