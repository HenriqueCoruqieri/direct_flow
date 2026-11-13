INSERT INTO "ticket_queue_wait" ("ticket_id", "department_id", "reason", "started_at", "ended_at")
SELECT "tt"."ticket_id",
  "tt"."to_department_id",
  'transferencia_recebida',
  "tt"."created_at",
  CASE
    WHEN "tt"."status" = 'pendente' THEN NULL
    ELSE greatest(coalesce("tt"."reviewed_at", "tt"."updated_at"), "tt"."created_at")
  END
FROM "ticket_transfer" AS "tt"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ticket_queue_wait" AS "w"
  WHERE "w"."ticket_id" = "tt"."ticket_id"
    AND "w"."reason" = 'transferencia_recebida'
    AND "w"."started_at" = "tt"."created_at"
);--> statement-breakpoint
INSERT INTO "ticket_queue_wait" ("ticket_id", "department_id", "reason", "started_at", "ended_at")
SELECT "hc"."ticket_id",
  coalesce("hc"."to_department_id", "t"."origin_department_id"),
  'abertura',
  "hc"."changed_at",
  CASE
    WHEN "e"."ended_at" IS NULL THEN NULL
    ELSE greatest("e"."ended_at", "hc"."changed_at")
  END
FROM "ticket_history" AS "hc"
JOIN "ticket" AS "t" ON "t"."id" = "hc"."ticket_id"
CROSS JOIN LATERAL (
  SELECT least(
    (
      SELECT min("h"."changed_at")
      FROM "ticket_history" AS "h"
      WHERE "h"."ticket_id" = "hc"."ticket_id"
        AND "h"."id" > "hc"."id"
        AND "h"."event" IN ('atribuicao', 'mudanca_status', 'transferencia_solicitada', 'transferencia_aprovada', 'transferencia_rejeitada', 'resolucao', 'encerramento', 'reabertura')
    ),
    (
      SELECT min("tt"."created_at")
      FROM "ticket_transfer" AS "tt"
      WHERE "tt"."ticket_id" = "hc"."ticket_id"
        AND "tt"."created_at" > "hc"."changed_at"
    )
  ) AS "ended_at"
) AS "e"
WHERE "hc"."event" = 'criacao'
  AND "hc"."to_status" = 'aberto'
  AND "hc"."to_assignee_id" IS NULL
  AND ("e"."ended_at" IS NOT NULL OR ("t"."status" = 'aberto' AND "t"."assigned_to" IS NULL))
  AND NOT EXISTS (
    SELECT 1
    FROM "ticket_queue_wait" AS "w"
    WHERE "w"."ticket_id" = "hc"."ticket_id"
      AND "w"."reason" = 'abertura'
      AND "w"."started_at" = "hc"."changed_at"
  );--> statement-breakpoint
INSERT INTO "ticket_queue_wait" ("ticket_id", "department_id", "reason", "started_at", "ended_at")
SELECT "hr"."ticket_id",
  "hr"."to_department_id",
  'devolucao_por_recusa',
  "hr"."changed_at",
  CASE
    WHEN "e"."ended_at" IS NULL THEN NULL
    ELSE greatest("e"."ended_at", "hr"."changed_at")
  END
FROM "ticket_history" AS "hr"
JOIN "ticket" AS "t" ON "t"."id" = "hr"."ticket_id"
CROSS JOIN LATERAL (
  SELECT least(
    (
      SELECT min("h"."changed_at")
      FROM "ticket_history" AS "h"
      WHERE "h"."ticket_id" = "hr"."ticket_id"
        AND "h"."id" > "hr"."id"
        AND "h"."event" IN ('atribuicao', 'mudanca_status', 'transferencia_solicitada', 'transferencia_aprovada', 'transferencia_rejeitada', 'resolucao', 'encerramento', 'reabertura')
    ),
    (
      SELECT min("tt"."created_at")
      FROM "ticket_transfer" AS "tt"
      WHERE "tt"."ticket_id" = "hr"."ticket_id"
        AND "tt"."created_at" > "hr"."changed_at"
    )
  ) AS "ended_at"
) AS "e"
WHERE "hr"."event" = 'transferencia_rejeitada'
  AND "hr"."to_department_id" IS NOT NULL
  AND ("e"."ended_at" IS NOT NULL OR "t"."status" = 'recusado')
  AND NOT EXISTS (
    SELECT 1
    FROM "ticket_queue_wait" AS "w"
    WHERE "w"."ticket_id" = "hr"."ticket_id"
      AND "w"."reason" = 'devolucao_por_recusa'
      AND "w"."started_at" = "hr"."changed_at"
  );
