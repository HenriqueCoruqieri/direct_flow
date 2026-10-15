CREATE TYPE "public"."attachment_history_event" AS ENUM('inclusao', 'exclusao');--> statement-breakpoint
CREATE TABLE "attachment_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attachment_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"attachment_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"event" "attachment_history_event" NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment_history" ADD CONSTRAINT "attachment_history_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_history" ADD CONSTRAINT "attachment_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_history_attachment_idx" ON "attachment_history" USING btree ("attachment_id","changed_at");--> statement-breakpoint
CREATE INDEX "attachment_history_ticket_idx" ON "attachment_history" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "attachment_history_actor_idx" ON "attachment_history" USING btree ("actor_id");