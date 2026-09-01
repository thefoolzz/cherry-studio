CREATE TABLE `publishing_template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`source_type` text NOT NULL,
	`source_title` text,
	`source_url` text,
	`blueprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "publishing_template_source_type_check" CHECK("publishing_template"."source_type" IN ('generated', 'url', 'pasted')),
	CONSTRAINT "publishing_template_name_check" CHECK(length(trim("publishing_template"."name")) > 0),
	CONSTRAINT "publishing_template_description_check" CHECK(length(trim("publishing_template"."description")) > 0)
);
--> statement-breakpoint
CREATE INDEX `publishing_template_updated_at_idx` ON `publishing_template` (`updated_at`);