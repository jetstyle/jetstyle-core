CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"token" varchar(512) NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"ttl" integer,
	"device" varchar(256),
	"ip_address" varchar(256),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"tenant" varchar(256),
	"first_name" text,
	"last_name" text,
	"username" varchar(256),
	"password" varchar(256),
	"phone" varchar(256),
	"locale" varchar(256),
	"geo_region" varchar(256),
	"avatar_file_id" varchar(256),
	"avatar_url" text
);
