import type { Metadata } from "next"

import { requireDirector } from "@/app/_lib/auth/director"
import { listCompanies } from "@/app/_lib/data/companies"

import CompaniesTable from "./_components/companies-table"
import CompanyFormDialog from "./_components/company-form-dialog"

export const metadata: Metadata = {
  title: "Empresas",
}

const CompaniesPage = async () => {
  await requireDirector()
  const companies = await listCompanies()

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">Empresas</h1>
        </div>
        <CompanyFormDialog />
      </div>

      <CompaniesTable companies={companies} />
    </div>
  )
}

export default CompaniesPage
