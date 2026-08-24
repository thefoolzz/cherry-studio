CREATE TABLE `publishing_account` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`partition` text NOT NULL,
	`status` text DEFAULT 'binding' NOT NULL,
	`last_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "publishing_account_platform_check" CHECK("publishing_account"."platform" IN ('wechat')),
	CONSTRAINT "publishing_account_status_check" CHECK("publishing_account"."status" IN ('binding', 'ready', 'expired')),
	CONSTRAINT "publishing_account_display_name_check" CHECK(length(trim("publishing_account"."display_name")) > 0),
	CONSTRAINT "publishing_account_partition_check" CHECK(length(trim("publishing_account"."partition")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publishing_account_partition_unique_idx` ON `publishing_account` (`partition`);--> statement-breakpoint
CREATE INDEX `publishing_account_platform_status_idx` ON `publishing_account` (`platform`,`status`);--> statement-breakpoint
CREATE TABLE `publishing_task` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`title` text NOT NULL,
	`markdown` text NOT NULL,
	`image_file_entry_ids` text DEFAULT '[]' NOT NULL,
	`cover_file_entry_id` text,
	`status` text DEFAULT 'prepared' NOT NULL,
	`app_msg_id` text,
	`edit_url` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `publishing_account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cover_file_entry_id`) REFERENCES `file_entry`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "publishing_task_status_check" CHECK("publishing_task"."status" IN ('prepared', 'opening', 'uploading', 'creating', 'created', 'failed', 'cancelled')),
	CONSTRAINT "publishing_task_title_check" CHECK(length(trim("publishing_task"."title")) > 0),
	CONSTRAINT "publishing_task_markdown_check" CHECK(length(trim("publishing_task"."markdown")) > 0)
);
--> statement-breakpoint
CREATE INDEX `publishing_task_account_created_at_idx` ON `publishing_task` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `publishing_task_status_created_at_idx` ON `publishing_task` (`status`,`created_at`);