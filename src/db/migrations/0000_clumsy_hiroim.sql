CREATE TABLE "activity_log" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(30) NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" varchar(10) NOT NULL,
	"description" varchar(255) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"client_id" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"company" varchar(150),
	"phone" varchar(15),
	"email" varchar(150),
	"city" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"value" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(10) DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"website_id" varchar(10) PRIMARY KEY NOT NULL,
	"client_id" varchar(10) NOT NULL,
	"project_name" varchar(150) NOT NULL,
	"url" varchar(255),
	"site_type" varchar(20) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"service_type" varchar(20) NOT NULL,
	"website_status" varchar(30) DEFAULT 'In Progress' NOT NULL,
	"maintenance_status" varchar(20) DEFAULT 'Not Started' NOT NULL,
	"start_date" date,
	"hosted_date" date,
	"last_invoice_sent" date,
	"last_payment_received" date,
	"renewal_date" date,
	"handover_date" date,
	"transfer_completed" boolean DEFAULT false NOT NULL,
	"service_type_changed_at" date,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_log_recent" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_websites_client" ON "websites" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_websites_renewal" ON "websites" USING btree ("renewal_date");