INSERT INTO "message_history" ("message_id", "ticket_id", "actor_id", "event", "content", "visibility", "changed_at")
SELECT "id", "ticket_id", "user_id", 'criacao', "content", "visibility", "created_at"
FROM "message"
ORDER BY "created_at", "id";
