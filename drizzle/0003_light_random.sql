ALTER TABLE `matches` ADD `ends_at` integer;
--> statement-breakpoint
UPDATE `matches` SET `ends_at` = `played_at` + 5400000 WHERE `ends_at` IS NULL;