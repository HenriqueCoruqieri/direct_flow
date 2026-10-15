ALTER TABLE "ticket_history" ALTER COLUMN "event" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."history_event";--> statement-breakpoint
CREATE TYPE "public"."history_event" AS ENUM('criacao', 'mudanca_status', 'mudanca_prioridade', 'atribuicao', 'transferencia_solicitada', 'transferencia_aprovada', 'transferencia_rejeitada', 'reabertura', 'encerramento', 'mudanca_tag', 'edicao', 'resolucao');--> statement-breakpoint
ALTER TABLE "ticket_history" ALTER COLUMN "event" SET DATA TYPE "public"."history_event" USING "event"::"public"."history_event";