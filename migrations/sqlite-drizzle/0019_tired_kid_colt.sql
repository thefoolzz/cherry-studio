PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_publishing_account` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`partition` text NOT NULL,
	`status` text DEFAULT 'binding' NOT NULL,
	`last_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "publishing_account_platform_check" CHECK("__new_publishing_account"."platform" IN ('wechat', 'douyin', 'xiaohongshu', 'zhihu')),
	CONSTRAINT "publishing_account_status_check" CHECK("__new_publishing_account"."status" IN ('binding', 'ready', 'expired')),
	CONSTRAINT "publishing_account_display_name_check" CHECK(length(trim("__new_publishing_account"."display_name")) > 0),
	CONSTRAINT "publishing_account_partition_check" CHECK(length(trim("__new_publishing_account"."partition")) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_publishing_account`("id", "platform", "display_name", "partition", "status", "last_verified_at", "created_at", "updated_at") SELECT "id", "platform", "display_name", "partition", "status", "last_verified_at", "created_at", "updated_at" FROM `publishing_account`;--> statement-breakpoint
DROP TABLE `publishing_account`;--> statement-breakpoint
ALTER TABLE `__new_publishing_account` RENAME TO `publishing_account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `publishing_account_partition_unique_idx` ON `publishing_account` (`partition`);--> statement-breakpoint
CREATE INDEX `publishing_account_platform_status_idx` ON `publishing_account` (`platform`,`status`);