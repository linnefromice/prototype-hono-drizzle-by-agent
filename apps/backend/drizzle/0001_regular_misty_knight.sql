ALTER TABLE `users` ADD `id_alias` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_alias_unique` ON `users` (`id_alias`);