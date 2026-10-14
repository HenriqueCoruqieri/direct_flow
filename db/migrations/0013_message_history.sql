CREATE TYPE "public"."message_history_event" AS ENUM('criacao', 'edicao', 'exclusao');--> statement-breakpoint
CREATE TABLE "message_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"event" "message_history_event" NOT NULL,
	"content" text NOT NULL,
	"visibility" "message_visibility" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_history_message_idx" ON "message_history" USING btree ("message_id","changed_at");--> statement-breakpoint
CREATE INDEX "message_history_ticket_idx" ON "message_history" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "message_history_actor_idx" ON "message_history" USING btree ("actor_id");