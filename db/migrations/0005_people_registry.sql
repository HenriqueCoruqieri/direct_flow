ALTER TABLE "department" ADD COLUMN "is_unassigned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "department_single_unassigned_idx" ON "department" USING btree ("is_unassigned") WHERE is_unassigned;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_unassigned_active" CHECK (not is_unassigned or is_active);--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_board_not_unassigned" CHECK (not (is_board and is_unassigned));