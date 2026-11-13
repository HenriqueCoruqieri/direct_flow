CREATE TYPE "public"."queue_wait_reason" AS ENUM('abertura', 'transferencia_recebida', 'devolucao_por_recusa');--> statement-breakpoint
CREATE TABLE "ticket_queue_wait" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_queue_wait_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"reason" "queue_wait_reason" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_wait_ended_after_started" CHECK ("ticket_queue_wait"."ended_at" is null or "ticket_queue_wait"."ended_at" >= "ticket_queue_wait"."started_at")
);
--> statement-breakpoint
ALTER TABLE "department_goal" RENAME COLUMN "backlog_limit" TO "overdue_tickets_limit";--> statement-breakpoint
ALTER TABLE "department_goal" DROP CONSTRAINT "department_goal_backlog_limit_non_negative";--> statement-breakpoint
ALTER TABLE "department_goal" DROP CONSTRAINT "department_goal_transfer_acceptance_min_percent_range";--> statement-breakpoint
ALTER TABLE "department_goal" ADD COLUMN "tmr_max_hours" smallint;--> statement-breakpoint
ALTER TABLE "ticket_queue_wait" ADD CONSTRAINT "ticket_queue_wait_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_queue_wait" ADD CONSTRAINT "ticket_queue_wait_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "queue_wait_ticket_idx" ON "ticket_queue_wait" USING btree ("ticket_id","started_at");--> statement-breakpoint
CREATE INDEX "queue_wait_department_ended_idx" ON "ticket_queue_wait" USING btree ("department_id","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "queue_wait_one_open_per_ticket_idx" ON "ticket_queue_wait" USING btree ("ticket_id") WHERE ended_at is null;--> statement-breakpoint
ALTER TABLE "department_goal" DROP COLUMN "transfer_acceptance_min_percent";--> statement-breakpoint
ALTER TABLE "department_goal" ADD CONSTRAINT "department_goal_overdue_tickets_limit_non_negative" CHECK ("department_goal"."overdue_tickets_limit" >= 0);--> statement-breakpoint
ALTER TABLE "department_goal" ADD CONSTRAINT "department_goal_tmr_max_hours_positive" CHECK ("department_goal"."tmr_max_hours" >= 1);