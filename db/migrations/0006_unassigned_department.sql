INSERT INTO "department" ("name", "is_active", "is_board", "is_unassigned")
SELECT 'Não alocado', true, false, true
WHERE NOT EXISTS (SELECT 1 FROM "department" WHERE "is_unassigned");
