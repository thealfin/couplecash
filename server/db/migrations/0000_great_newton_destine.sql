CREATE TYPE "public"."account_type" AS ENUM('bank', 'e_wallet', 'deposito', 'cash');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('pending', 'lunas', 'terlambat');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('mingguan', 'bulanan', 'berkala');--> statement-breakpoint
CREATE TYPE "public"."ownership_type" AS ENUM('suami', 'istri', 'bersama');--> statement-breakpoint
CREATE TYPE "public"."role_type" AS ENUM('suami', 'istri');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('cloudflare_r2');--> statement-breakpoint
CREATE TYPE "public"."theme_pref" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('manual', 'ai_scan');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."vault_platform_type" AS ENUM('bank', 'e_wallet', 'crypto_wallet', 'lainnya');--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(150),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_user_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_enabled" boolean DEFAULT false NOT NULL,
	"preferred_model" varchar(50) DEFAULT 'gemini-1.5-flash',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid,
	"owner_type" "ownership_type" DEFAULT 'bersama' NOT NULL,
	"period_type" "budget_period" NOT NULL,
	"limit_amount" numeric(18, 2) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(50),
	"color_token" varchar(30),
	"applies_to" "ownership_type" DEFAULT 'bersama' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"owner_type" "ownership_type" DEFAULT 'bersama' NOT NULL,
	"account_type" "account_type" NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"account_number_masked" varchar(50),
	"account_number_encrypted" text,
	"initial_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"icon" varchar(50),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" varchar(120) DEFAULT 'Keluarga Kami' NOT NULL,
	"invite_code" varchar(20) NOT NULL,
	"currency" varchar(6) DEFAULT 'IDR' NOT NULL,
	"period_start_day" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"recorded_by_user_id" uuid NOT NULL,
	"owner_type" "ownership_type" DEFAULT 'bersama' NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"transaction_time" time DEFAULT current_time NOT NULL,
	"merchant_name" varchar(200),
	"note" text,
	"source" "transaction_source" DEFAULT 'manual' NOT NULL,
	"receipt_object_key" text,
	"receipt_storage" "storage_provider" DEFAULT 'cloudflare_r2',
	"ai_confidence" numeric(4, 3),
	"event_label" varchar(150),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"household_id" uuid,
	"role" "role_type",
	"full_name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_object_key" text,
	"app_pin_hash" varchar(255),
	"biometric_enabled" boolean DEFAULT false NOT NULL,
	"theme" "theme_pref" DEFAULT 'system' NOT NULL,
	"language" varchar(10) DEFAULT 'id' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vault_credentials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"household_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"platform_type" "vault_platform_type" DEFAULT 'bank' NOT NULL,
	"platform_name" varchar(100) NOT NULL,
	"username_masked" varchar(100),
	"secret_encrypted" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_user_settings" ADD CONSTRAINT "ai_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_credentials" ADD CONSTRAINT "vault_credentials_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_credentials" ADD CONSTRAINT "vault_credentials_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budgets_household_period" ON "budgets" USING btree ("household_id","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_household_type_name_unique" ON "categories" USING btree ("household_id","type","name");--> statement-breakpoint
CREATE INDEX "idx_accounts_household" ON "financial_accounts" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_tx_household_date" ON "transactions" USING btree ("household_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_tx_account" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_tx_category" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_tx_owner" ON "transactions" USING btree ("household_id","owner_type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_household_role_unique" ON "users" USING btree ("household_id","role");--> statement-breakpoint
CREATE INDEX "idx_users_household" ON "users" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_vault_household" ON "vault_credentials" USING btree ("household_id");