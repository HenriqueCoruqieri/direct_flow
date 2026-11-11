CREATE TABLE "department_goal" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "department_goal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"department_id" integer NOT NULL,
	"sla_min_percent" smallint NOT NULL,
	"tma_max_hours" smallint NOT NULL,
	"overdue_hours_limit" smallint NOT NULL,
	"backlog_limit" integer NOT NULL,
	"transfer_acceptance_min_percent" smallint NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "department_goal_sla_min_percent_range" CHECK ("department_goal"."sla_min_percent" between 1 and 100),
	CONSTRAINT "department_goal_tma_max_hours_positive" CHECK ("department_goal"."tma_max_hours" >= 1),
	CONSTRAINT "department_goal_overdue_hours_limit_non_negative" CHECK ("department_goal"."overdue_hours_limit" >= 0),
	CONSTRAINT "department_goal_backlog_limit_non_negative" CHECK ("department_goal"."backlog_limit" >= 0),
	CONSTRAINT "department_goal_transfer_acceptance_min_percent_range" CHECK ("department_goal"."transfer_acceptance_min_percent" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "department_goal" ADD CONSTRAINT "department_goal_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_goal" ADD CONSTRAINT "department_goal_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "department_goal_department_idx" ON "department_goal" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "department_goal_updated_by_idx" ON "department_goal" USING btree ("updated_by");