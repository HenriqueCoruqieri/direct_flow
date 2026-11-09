ALTER TABLE "ticket" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_company_idx" ON "ticket" USING btree ("company_id");