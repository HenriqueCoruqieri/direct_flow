ALTER TABLE "department" ADD COLUMN "is_board" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "department_single_board_idx" ON "department" USING btree ("is_board") WHERE is_board;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_board_active" CHECK (not is_board or is_active);