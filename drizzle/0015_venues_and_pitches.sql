ALTER TABLE `places` RENAME TO `venues`;
--> statement-breakpoint
DROP INDEX IF EXISTS `places_name_idx`;
--> statement-breakpoint
CREATE INDEX `venues_name_idx` ON `venues` (`name`);
--> statement-breakpoint
CREATE TABLE `pitches` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`format` integer,
	`price` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pitches_venue_name_idx` ON `pitches` (`venue_id`,`name`);
--> statement-breakpoint
ALTER TABLE `matches` RENAME COLUMN `place_id` TO `venue_id`;
--> statement-breakpoint
ALTER TABLE `matches` ADD `pitch_id` text REFERENCES pitches(id) ON DELETE set null;
