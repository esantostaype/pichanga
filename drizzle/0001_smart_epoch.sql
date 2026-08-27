CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`google_place_id` text,
	`maps_url` text,
	`lat` real,
	`lng` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `places_name_idx` ON `places` (`name`);--> statement-breakpoint
ALTER TABLE `matches` ADD `place_id` text REFERENCES places(id);--> statement-breakpoint
ALTER TABLE `matches` ADD `recurrence` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `series_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `matches_series_slot_idx` ON `matches` (`series_id`,`played_at`);
--> statement-breakpoint
INSERT INTO `places` (`id`, `name`, `created_at`)
SELECT lower(hex(randomblob(16))), `location`, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM (SELECT DISTINCT `location` FROM `matches` WHERE `location` IS NOT NULL AND trim(`location`) <> '');--> statement-breakpoint
UPDATE `matches` SET `place_id` = (SELECT `id` FROM `places` WHERE `places`.`name` = `matches`.`location`) WHERE `location` IS NOT NULL AND trim(`location`) <> '';