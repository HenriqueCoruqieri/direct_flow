INSERT INTO "attachment_history" ("attachment_id", "ticket_id", "actor_id", "event", "file_name", "mime_type", "size_bytes", "storage_key", "changed_at")
SELECT "id", "ticket_id", "uploaded_by", 'inclusao', "file_name", "mime_type", "size_bytes", "storage_key", "created_at"
FROM "attachment"
ORDER BY "created_at", "id";--> statement-breakpoint
DELETE FROM "ticket_history" WHERE "event" IN ('anexo_incluido', 'anexo_removido');
