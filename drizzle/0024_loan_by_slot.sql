CREATE TABLE `__new_match_loans` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`slot` integer NOT NULL,
	`team_id` text NOT NULL,
	`player_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `match_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_match_loans` (`id`, `match_id`, `slot`, `team_id`, `player_id`, `created_at`) SELECT `id`, `match_id`, `slot`, `team_id`, `player_id`, `created_at` FROM `match_loans`;
--> statement-breakpoint
DROP TABLE `match_loans`;
--> statement-breakpoint
ALTER TABLE `__new_match_loans` RENAME TO `match_loans`;
--> statement-breakpoint
CREATE UNIQUE INDEX `match_loans_slot_player_idx` ON `match_loans` (`match_id`,`slot`,`player_id`);
