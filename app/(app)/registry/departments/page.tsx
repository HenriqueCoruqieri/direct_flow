import type { Metadata } from "next"

import { requireDirector } from "@/app/_lib/auth/director"
import {
  listDepartments,
  listEditableDepartmentMembers,
} from "@/app/_lib/data/departments"

import DepartmentFormDialog from "./_components/department-form-dialog"
import DepartmentsTable from "./_components/departments-table"

export const metadata: Metadata = {
  title: "Setores",
}

const DepartmentsPage = async () => {
  await requireDirector()
  const [departments, members] = await Promise.all([
    listDepartments(),
    listEditableDepartmentMembers(),
  ])

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">Setores</h1>
        </div>
        <DepartmentFormDialog />
      </div>

      <DepartmentsTable departments={departments} members={members} />
    </div>
  )
}

export default DepartmentsPage
