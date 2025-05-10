CREATE TABLE "basic_auth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"login" varchar(256) NOT NULL,
	"password_hash" varchar(256) NOT NULL,
	"tenant" varchar(256),
	"last_login_at" timestamp,
	"login_attempts" integer DEFAULT 0,
	"status" varchar(64) DEFAULT 'active' NOT NULL,
	"roles" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "basic_auth_accounts_login_unique" UNIQUE("login")
);
