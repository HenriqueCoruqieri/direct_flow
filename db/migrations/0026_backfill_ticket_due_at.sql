UPDATE "ticket_transfer" AS "tt"
SET "from_due_at" = "t"."created_at" + make_interval(hours => CASE "t"."priority"
    WHEN 'critica' THEN 3
    WHEN 'alta' THEN 6
    WHEN 'media' THEN 12
    WHEN 'baixa' THEN 24
  END),
  "from_assignee_id" = NULL
FROM "ticket" AS "t"
WHERE "t"."id" = "tt"."ticket_id"
  AND "tt"."status" = 'pendente'
  AND "tt"."from_due_at" IS NULL;--> statement-breakpoint
UPDATE "ticket" AS "t"
SET "due_at" = NULL
WHERE "t"."due_at" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "ticket_transfer" AS "tt"
    WHERE "tt"."ticket_id" = "t"."id"
      AND "tt"."status" = 'pendente'
  );--> statement-breakpoint
UPDATE "ticket" AS "t"
SET "due_at" = "t"."created_at" + make_interval(hours => CASE "t"."priority"
    WHEN 'critica' THEN 3
    WHEN 'alta' THEN 6
    WHEN 'media' THEN 12
    WHEN 'baixa' THEN 24
  END)
WHERE "t"."due_at" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "ticket_transfer" AS "tt"
    WHERE "tt"."ticket_id" = "t"."id"
      AND "tt"."status" = 'pendente'
  );
