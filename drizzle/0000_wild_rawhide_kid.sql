CREATE TABLE `task_records` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
