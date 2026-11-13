CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY,
	"attempts" integer DEFAULT 0 NOT NULL,
	"window_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"message_id" uuid,
	"user_id" uuid,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reads_pkey" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" text NOT NULL,
	"from_user_id" uuid,
	"from_role" text DEFAULT 'system' NOT NULL,
	"to_role" text NOT NULL,
	"order_ref" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"step_code" text NOT NULL,
	"owner_role" text NOT NULL,
	"done_at" timestamp with time zone,
	"done_by_user_id" uuid,
	"done_by_role" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ref" text NOT NULL UNIQUE,
	"client" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"product" text NOT NULL,
	"quantity" integer NOT NULL,
	"fabric" text DEFAULT '' NOT NULL,
	"fabric_meters" double precision,
	"personalization" text DEFAULT 'none' NOT NULL,
	"status" text DEFAULT 'imported' NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"is_express" boolean DEFAULT false NOT NULL,
	"is_stockout" boolean DEFAULT false NOT NULL,
	"stockout_note" text DEFAULT '' NOT NULL,
	"planned_date" date,
	"step_index" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'csv' NOT NULL,
	"external_id" text UNIQUE,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"source" text NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"errors" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identity_id" text NOT NULL UNIQUE,
	"username" text NOT NULL UNIQUE,
	"display_name" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"failed_at" timestamp with time zone,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "messages_recipient_idx" ON "messages" ("to_role","created_at");--> statement-breakpoint
CREATE INDEX "steps_order_idx" ON "order_steps" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_planned_idx" ON "orders" ("status","planned_date");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" ("phone");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id");--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_user_id_users_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "order_steps" ADD CONSTRAINT "order_steps_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "order_steps" ADD CONSTRAINT "order_steps_done_by_user_id_users_id_fkey" FOREIGN KEY ("done_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");