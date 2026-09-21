CREATE TYPE "public"."approval_status" AS ENUM('pendente', 'aprovado', 'cancelado', 'rejeitado');--> statement-breakpoint
CREATE TYPE "public"."history_event" AS ENUM('criacao', 'mudanca_status', 'mudanca_prioridade', 'atribuicao', 'transferencia_solicitada', 'transferencia_aprovada', 'transferencia_rejeitada', 'reabertura', 'encerramento');--> statement-breakpoint
CREATE TYPE "public"."message_visibility" AS ENUM('publica', 'interna');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('baixa', 'media', 'alta', 'critica');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('aberto', 'em_analise', 'encaminhado', 'aguardando_aprovacao', 'em_andamento', 'resolvido', 'fechado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('duvida', 'ocorrencia', 'solicitacao', 'sugestao_de_melhoria', 'incidente', 'bug');--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attachment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"message_id" integer,
	"uploaded_by" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_size_positive" CHECK ("attachment"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "department_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"visibility" "message_visibility" DEFAULT 'publica' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_id_ticket_key" UNIQUE("id","ticket_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tag_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"department_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" "ticket_type" NOT NULL,
	"status" "ticket_status" DEFAULT 'aberto' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'media' NOT NULL,
	"created_by" integer NOT NULL,
	"assigned_to" integer,
	"origin_department_id" integer NOT NULL,
	"current_department_id" integer NOT NULL,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_title_length" CHECK (char_length("ticket"."title") between 3 and 200)
);
--> statement-breakpoint
CREATE TABLE "ticket_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"changed_by" integer NOT NULL,
	"event" "history_event" NOT NULL,
	"from_status" "ticket_status",
	"to_status" "ticket_status",
	"from_priority" "ticket_priority",
	"to_priority" "ticket_priority",
	"from_department_id" integer,
	"to_department_id" integer,
	"from_assignee_id" integer,
	"to_assignee_id" integer,
	"note" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_tag" (
	"ticket_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_tag_ticket_id_tag_id_pk" PRIMARY KEY("ticket_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_transfer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_transfer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"from_department_id" integer NOT NULL,
	"to_department_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"request_reason" text,
	"status" "approval_status" DEFAULT 'pendente' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_different_departments" CHECK ("ticket_transfer"."from_department_id" <> "ticket_transfer"."to_department_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"department_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_message_ticket_fk" FOREIGN KEY ("message_id","ticket_id") REFERENCES "public"."message"("id","ticket_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_origin_department_id_department_id_fk" FOREIGN KEY ("origin_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_current_department_id_department_id_fk" FOREIGN KEY ("current_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_department_id_department_id_fk" FOREIGN KEY ("from_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_department_id_department_id_fk" FOREIGN KEY ("to_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_assignee_id_users_id_fk" FOREIGN KEY ("from_assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_assignee_id_users_id_fk" FOREIGN KEY ("to_assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD CONSTRAINT "ticket_tag_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD CONSTRAINT "ticket_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_from_department_id_department_id_fk" FOREIGN KEY ("from_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_to_department_id_department_id_fk" FOREIGN KEY ("to_department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_transfer" ADD CONSTRAINT "ticket_transfer_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_ticket_idx" ON "attachment" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "attachment_message_idx" ON "attachment" USING btree ("message_id","ticket_id");--> statement-breakpoint
CREATE INDEX "attachment_uploaded_by_idx" ON "attachment" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_storage_key_idx" ON "attachment" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "department_name_lower_idx" ON "department" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "message_ticket_idx" ON "message" USING btree ("ticket_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "message_user_idx" ON "message" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_per_department_idx" ON "tag" USING btree ("department_id",lower("name")) WHERE is_active;--> statement-breakpoint
CREATE INDEX "tag_department_idx" ON "tag" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "ticket_dept_status_idx" ON "ticket" USING btree ("current_department_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ticket_created_by_idx" ON "ticket" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ticket_assigned_to_idx" ON "ticket" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "ticket_origin_department_idx" ON "ticket" USING btree ("origin_department_id");--> statement-breakpoint
CREATE INDEX "history_ticket_idx" ON "ticket_history" USING btree ("ticket_id","changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "history_changed_by_idx" ON "ticket_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "history_to_department_idx" ON "ticket_history" USING btree ("to_department_id");--> statement-breakpoint
CREATE INDEX "history_to_assignee_idx" ON "ticket_history" USING btree ("to_assignee_id");--> statement-breakpoint
CREATE INDEX "ticket_tag_tag_idx" ON "ticket_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "transfer_inbox_idx" ON "ticket_transfer" USING btree ("to_department_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transfer_ticket_idx" ON "ticket_transfer" USING btree ("ticket_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transfer_from_department_idx" ON "ticket_transfer" USING btree ("from_department_id");--> statement-breakpoint
CREATE INDEX "transfer_requested_by_idx" ON "ticket_transfer" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "transfer_reviewed_by_idx" ON "ticket_transfer" USING btree ("reviewed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_one_pending_per_ticket_idx" ON "ticket_transfer" USING btree ("ticket_id") WHERE status = 'pendente';--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "user_department_idx" ON "users" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "user_department_role_idx" ON "users" USING btree ("department_id","role") WHERE is_active;