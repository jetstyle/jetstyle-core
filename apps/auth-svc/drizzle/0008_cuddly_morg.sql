CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"tenant" varchar(256) NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" varchar(256),
	"phone" varchar(256),
	"avatar_file_id" varchar(256),
	"avatar_url" text,
	"user_id" varchar(256),
	"invite_code" varchar(256)
);
--> statement-breakpoint
CREATE TABLE "permission_binds" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" varchar(256) NOT NULL,
	"tenant" varchar(256) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"activation_status" varchar(256) DEFAULT 'active' NOT NULL
);
