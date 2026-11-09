ALTER TYPE "public"."history_event" ADD VALUE 'mudanca_empresa';--> statement-breakpoint
ALTER TABLE "ticket_history" ADD COLUMN "from_company_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD COLUMN "to_company_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_company_id_company_id_fk" FOREIGN KEY ("from_company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_company_id_company_id_fk" FOREIGN KEY ("to_company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_to_company_idx" ON "ticket_history" USING btree ("to_company_id");