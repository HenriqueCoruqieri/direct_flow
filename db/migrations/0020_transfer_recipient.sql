ALTER TABLE "ticket_transfer" ADD COLUMN "to_user_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transfer_to_user_idx" ON "ticket_transfer" USING btree ("to_user_id");