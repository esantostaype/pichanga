CREATE TABLE `match_games` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`slot` integer NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_team_id`) REFERENCES `match_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`away_team_id`) REFERENCES `match_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_games_match_idx` ON `match_games` (`match_id`,`slot`);--> statement-breakpoint
CREATE TABLE `match_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`game_id` text NOT NULL,
	`team_id` text NOT NULL,
	`player_id` text NOT NULL,
	`scored_at` integer NOT NULL,
	`recorded_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `match_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `match_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_goals_game_idx` ON `match_goals` (`game_id`,`scored_at`);