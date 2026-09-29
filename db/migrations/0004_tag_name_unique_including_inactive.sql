DROP INDEX "tag_name_per_department_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_per_department_idx" ON "tag" USING btree ("department_id",lower("name"));