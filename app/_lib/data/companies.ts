import { and, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import { isWeekday } from "@/app/_lib/domain/company"
import type {
  CompanyContactPosition,
  CompanyListItem,
  CompanyValues,
  InsertCompanyOutcome,
  UpdateCompanyActiveOutcome,
  UpdateCompanyOutcome,
  Weekday,
} from "@/app/_lib/types/company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"
import { db } from "@/db"
import { company, companyContact } from "@/db/schema"

const COMPANY_CNPJ_CONSTRAINT = "company_cnpj_idx"
const TIME_MINUTES_LENGTH = 5

const toWeekdays = (days: number[] | null): Weekday[] | null =>
  days ? days.filter(isWeekday) : null

const toClockTime = (time: string | null): string | null =>
  time ? time.slice(0, TIME_MINUTES_LENGTH) : null

const toCompanyColumns = (values: CompanyValues) => ({
  cnpj: values.cnpj,
  legalName: values.legalName,
  tradeName: values.tradeName,
  email: values.email,
  cep: values.cep,
  state: values.state,
  street: values.street,
  number: values.number,
  district: values.district,
  city: values.city,
  complement: values.complement,
  managerName: values.managerName,
  managerPhone: values.managerPhone,
  businessDays: values.businessDays,
  opensAt: values.opensAt,
  closesAt: values.closesAt,
  notes: values.notes,
})

interface ExistingCompany {
  isActive: boolean
}

async function findExistingCompanyByCnpj(
  cnpj: string,
): Promise<ExistingCompany | null> {
  const [row] = await db
    .select({ isActive: company.isActive })
    .from(company)
    .where(eq(company.cnpj, cnpj))
    .limit(1)

  return row ?? null
}

export async function listCompanies(): Promise<CompanyListItem[]> {
  const primaryContact = alias(companyContact, "primary_contact")
  const secondaryContact = alias(companyContact, "secondary_contact")

  const rows = await db
    .select({
      id: company.id,
      cnpj: company.cnpj,
      legalName: company.legalName,
      tradeName: company.tradeName,
      email: company.email,
      primaryPhone: primaryContact.phone,
      secondaryPhone: secondaryContact.phone,
      cep: company.cep,
      state: company.state,
      street: company.street,
      number: company.number,
      district: company.district,
      city: company.city,
      complement: company.complement,
      managerName: company.managerName,
      managerPhone: company.managerPhone,
      businessDays: company.businessDays,
      opensAt: company.opensAt,
      closesAt: company.closesAt,
      notes: company.notes,
      isActive: company.isActive,
      createdAt: company.createdAt,
    })
    .from(company)
    .leftJoin(
      primaryContact,
      sql`${primaryContact.companyId} = ${company.id} and ${primaryContact.position} = 'primary'`,
    )
    .leftJoin(
      secondaryContact,
      sql`${secondaryContact.companyId} = ${company.id} and ${secondaryContact.position} = 'secondary'`,
    )
    .orderBy(sql`lower(${company.tradeName})`, company.id)

  return rows.map((row) => ({
    ...row,
    primaryPhone: row.primaryPhone ?? "",
    businessDays: toWeekdays(row.businessDays),
    opensAt: toClockTime(row.opensAt),
    closesAt: toClockTime(row.closesAt),
  }))
}

export async function listTicketCompanyOptions(): Promise<
  TicketCompanyOption[]
> {
  return db
    .select({
      id: company.id,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
    })
    .from(company)
    .where(eq(company.isActive, true))
    .orderBy(sql`lower(${company.tradeName})`, company.id)
}

export async function insertCompany(
  values: CompanyValues,
): Promise<InsertCompanyOutcome> {
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(company)
        .values(toCompanyColumns(values))
        .returning({ id: company.id })

      await tx.insert(companyContact).values([
        {
          companyId: created.id,
          position: "primary",
          phone: values.primaryPhone,
        },
        ...(values.secondaryPhone === null
          ? []
          : [
              {
                companyId: created.id,
                position: "secondary" as const,
                phone: values.secondaryPhone,
              },
            ]),
      ])

      return created.id
    })

    return { status: "saved", id }
  } catch (error) {
    if (!isUniqueViolation(error, COMPANY_CNPJ_CONSTRAINT)) {
      throw error
    }

    const existing = await findExistingCompanyByCnpj(values.cnpj)
    if (!existing) {
      throw error
    }

    return { status: "cnpj_taken", existingIsActive: existing.isActive }
  }
}

export async function updateCompany(
  id: number,
  values: CompanyValues,
): Promise<UpdateCompanyOutcome> {
  try {
    return await db.transaction(async (tx): Promise<UpdateCompanyOutcome> => {
      const [updated] = await tx
        .update(company)
        .set({ ...toCompanyColumns(values), updatedAt: new Date() })
        .where(eq(company.id, id))
        .returning({ id: company.id })

      if (!updated) {
        return { status: "not_found" }
      }

      const upsertContact = (position: CompanyContactPosition, phone: string) =>
        tx
          .insert(companyContact)
          .values({ companyId: id, position, phone })
          .onConflictDoUpdate({
            target: [companyContact.companyId, companyContact.position],
            set: { phone, updatedAt: new Date() },
          })

      await upsertContact("primary", values.primaryPhone)

      if (values.secondaryPhone === null) {
        await tx
          .delete(companyContact)
          .where(
            and(
              eq(companyContact.companyId, id),
              eq(companyContact.position, "secondary"),
            ),
          )
      } else {
        await upsertContact("secondary", values.secondaryPhone)
      }

      return { status: "saved", id }
    })
  } catch (error) {
    if (!isUniqueViolation(error, COMPANY_CNPJ_CONSTRAINT)) {
      throw error
    }

    const existing = await findExistingCompanyByCnpj(values.cnpj)
    if (!existing) {
      throw error
    }

    return { status: "cnpj_taken", existingIsActive: existing.isActive }
  }
}

export async function updateCompanyActive(
  id: number,
  isActive: boolean,
): Promise<UpdateCompanyActiveOutcome> {
  const [updated] = await db
    .update(company)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(company.id, id))
    .returning({ id: company.id })

  return updated ? { status: "saved", id } : { status: "not_found" }
}
