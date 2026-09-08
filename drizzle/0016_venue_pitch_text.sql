DROP TABLE `pitches`;--> statement-breakpoint
ALTER TABLE `venues` ADD `pitch` text;--> statement-breakpoint
ALTER TABLE `matches` DROP COLUMN `pitch_id`;