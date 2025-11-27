CREATE TABLE "auth_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"tenant" varchar(256) NOT NULL,
	"key_type" varchar(256) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" varchar(256) NOT NULL,
	"label" varchar(256),
	"prefix" varchar(64) NOT NULL,
	"secret_hash" varchar(256) NOT NULL,
	"status" varchar(64) DEFAULT 'active' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"tenants" jsonb DEFAULT 'null'::jsonb,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
);
