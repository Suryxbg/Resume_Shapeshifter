CREATE TABLE `resume_history` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`job_title` varchar(255) NOT NULL,
	`company_name` varchar(255),
	`original_resume_text` text NOT NULL,
	`job_description_text` text NOT NULL,
	`generated_resume_text` text NOT NULL,
	`ats_score` int,
	`tailoring_run_id` varchar(36),
	`run_data` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resume_history_id` PRIMARY KEY(`id`)
);
