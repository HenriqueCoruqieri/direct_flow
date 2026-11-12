CREATE TABLE "department_due_hours" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "department_due_hours_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"department_id" integer NOT NULL,
	"critica_hours" smallint NOT NULL,
	"alta_hours" smallint NOT NULL,
	"media_hours" smallint NOT NULL,
	"baixa_hours" smallint NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "department_due_hours_critica_range" CHECK ("department_due_hours"."critica_hours" between 1 and 999),
	CONSTRAINT "department_due_hours_alta_range" CHECK ("department_due_hours"."alta_hours" between 1 and 999),
	CONSTRAINT "department_due_hours_media_range" CHECK ("department_due_hours"."media_hours" between 1 and 999),
	CONSTRAINT "department_due_hours_baixa_range" CHECK ("department_due_hours"."baixa_hours" between 1 and 999)
);
--> statement-breakpoint
ALTER TABLE "ticket_history" ADD COLUMN "to_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD COLUMN "from_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD COLUMN "from_assignee_id" integer;--> statement-breakpoint
ALTER TABLE "department_due_hours" ADD CONSTRAINT "department_due_hours_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_due_hours" ADD CONSTRAINT "department_due_hours_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "department_due_hours_department_idx" ON "department_due_hours" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "department_due_hours_updated_by_idx" ON "department_due_hours" USING btree ("updated_by");--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_from_assignee_id_users_id_fk" FOREIGN KEY ("from_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_dept_due_idx" ON "ticket" USING btree ("current_department_id","due_at");--> statement-breakpoint
CREATE INDEX "transfer_from_assignee_idx" ON "ticket_transfer" USING btree ("from_assignee_id");