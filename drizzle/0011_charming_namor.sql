CREATE TABLE `match_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`slot` integer NOT NULL,
	`name` text NOT NULL,
	`accent` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_teams_slot_idx` ON `match_teams` (`match_id`,`slot`);--> statement-breakpoint
ALTER TABLE `match_players` ADD `team_id` text REFERENCES match_teams(id);--> statement-breakpoint
ALTER TABLE `match_players` ADD `is_keeper` integer DEFAULT false NOT NULL;