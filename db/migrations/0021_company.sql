CREATE TYPE "public"."brazilian_state" AS ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');--> statement-breakpoint
CREATE TYPE "public"."company_contact_position" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TABLE "company" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cnpj" text NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text NOT NULL,
	"email" text NOT NULL,
	"cep" text NOT NULL,
	"state" "brazilian_state" NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"district" text NOT NULL,
	"city" text NOT NULL,
	"complement" text,
	"manager_name" text NOT NULL,
	"manager_phone" text NOT NULL,
	"business_days" smallint[],
	"opens_at" time,
	"closes_at" time,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_cnpj_format" CHECK (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'),
	CONSTRAINT "company_cep_digits" CHECK (cep ~ '^[0-9]{8}$'),
	CONSTRAINT "company_manager_phone_digits" CHECK (manager_phone ~ '^[1-9][0-9]{9,10}$'),
	CONSTRAINT "company_business_hours_complete" CHECK ((business_days is null and opens_at is null and closes_at is null) or (cardinality(business_days) > 0 and opens_at is not null and closes_at is not null)),
	CONSTRAINT "company_business_hours_order" CHECK (closes_at is null or opens_at is null or closes_at > opens_at),
	CONSTRAINT "company_business_days_range" CHECK (business_days is null or business_days <@ array[1,2,3,4,5,6,7]::smallint[])
);
--> statement-breakpoint
CREATE TABLE "company_contact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" integer NOT NULL,
	"position" "company_contact_position" NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_contact_phone_digits" CHECK (phone ~ '^[1-9][0-9]{9,10}$')
);
--> statement-breakpoint
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_cnpj_idx" ON "company" USING btree ("cnpj");--> statement-breakpoint
CREATE UNIQUE INDEX "company_contact_company_position_idx" ON "company_contact" USING btree ("company_id","position");