ALTER TABLE `match_loans` ADD `slot` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `match_loans` SET `slot` = (SELECT `slot` FROM `match_games` WHERE `match_games`.`id` = `match_loans`.`game_id`);
