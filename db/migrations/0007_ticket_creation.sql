ALTER TYPE "public"."history_event" ADD VALUE 'mudanca_tag';--> statement-breakpoint
ALTER TABLE "ticket_history" ADD COLUMN "from_tag_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD COLUMN "to_tag_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_tag_id_tag_id_fk" FOREIGN KEY ("from_tag_id") REFERENCES "public"."tag"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_tag_id_tag_id_fk" FOREIGN KEY ("to_tag_id") REFERENCES "public"."tag"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_to_tag_idx" ON "ticket_history" USING btree ("to_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_tag_single_per_ticket_idx" ON "ticket_tag" USING btree ("ticket_id");