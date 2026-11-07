import { eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import { isWeekday } from "@/app/_lib/domain/company"
import type {
  CompanyListItem,
  CompanyValues,
  InsertCompanyOutcome,
  Weekday,
} from "@/app/_lib/types/company"
import { db } from "@/db"
import { company, companyContact } from "@/db/schema"

const COMPANY_CNPJ_CONSTRAINT = "company_cnpj_idx"
const TIME_MINUTES_LENGTH = 5

const toWeekdays = (days: number[] | null): Weekday[] | null =>
  days ? days.filter(isWeekday) : null

const toClockTime = (time: string | null): string | null =>
  time ? time.slice(0, TIME_MINUTES_LENGTH) : null

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

export async function insertCompany(
  values: CompanyValues,
): Promise<InsertCompanyOutcome> {
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(company)
        .values({
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
