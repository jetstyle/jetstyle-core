CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"title" varchar(256) NOT NULL,
	"task_statuses" jsonb DEFAULT '{}'::jsonb
);
