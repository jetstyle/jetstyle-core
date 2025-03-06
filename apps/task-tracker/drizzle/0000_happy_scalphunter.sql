CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" varchar(64) NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"due_date" timestamp,
	"priority" varchar(64),
	"assignee" varchar(256)
);
