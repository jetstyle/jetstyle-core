CREATE TABLE IF NOT EXISTS "basic_auth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"login" varchar(256) NOT NULL,
	"password" varchar(256) NOT NULL,
	"last_login_at" timestamp,
	"login_attempts" integer DEFAULT 0,
	"is_locked" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"role" varchar(64) DEFAULT 'user',
	"tenant" varchar(256),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "basic_auth_accounts_login_unique" UNIQUE("login")
);
