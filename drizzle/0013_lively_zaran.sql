ALTER TABLE `matches` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `is_demo` integer DEFAULT false NOT NULL;