CREATE TABLE `saved_team_players` (
	`team_id` text NOT NULL,
	`player_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `player_id`),
	FOREIGN KEY (`team_id`) REFERENCES `saved_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`badge` text,
	`crest_url` text,
	`accent` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_teams_name_idx` ON `saved_teams` (`is_demo`,`name`);