ALTER TABLE `places` ADD `format` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `position` text DEFAULT 'mid' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `pace` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `stamina` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `finishing` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `passing` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `defending` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `goalkeeping` integer DEFAULT 3 NOT NULL;