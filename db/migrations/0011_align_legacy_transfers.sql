UPDATE "ticket" AS "t"
SET "current_department_id" = "tt"."to_department_id",
  "assigned_to" = NULL,
  "updated_at" = now()
FROM "ticket_transfer" AS "tt"
WHERE "tt"."ticket_id" = "t"."id"
  AND "tt"."status" = 'pendente'
  AND "t"."current_department_id" <> "tt"."to_department_id";--> statement-breakpoint
WITH "reopened" AS (
  UPDATE "ticket" AS "t"
  SET "status" = 'aberto',
    "updated_at" = now()
  WHERE "t"."status" = 'aguardando_aprovacao'
    AND NOT EXISTS (
      SELECT 1
      FROM "ticket_transfer" AS "tt"
      WHERE "tt"."ticket_id" = "t"."id"
        AND "tt"."status" = 'pendente'
    )
  RETURNING "t"."id"
)
INSERT INTO "ticket_history" ("ticket_id", "changed_by", "event", "from_status", "to_status", "note", "changed_at")
SELECT "reopened"."id", NULL, 'mudanca_status', 'aguardando_aprovacao', 'aberto', 'Ajuste de dados: o chamado aguardava aprovação sem envio pendente para outro setor e voltou para Aberto.', now()
FROM "reopened";
