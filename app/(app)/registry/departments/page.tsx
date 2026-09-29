import type { Metadata } from "next"

import { requireDirector } from "@/app/_lib/auth/director"
import { listDepartments } from "@/app/_lib/data/departments"

import DepartmentFormDialog from "./_components/department-form-dialog"
import DepartmentsTable from "./_components/departments-table"

export const metadata: Metadata = {
  title: "Setores",
}

const DepartmentsPage = async () => {
  await requireDirector()
  const departments = await listDepartments()

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">Setores</h1>
          <p className="text-caption text-muted-foreground">
            Crie, renomeie e ative ou desative os setores da organização.
          </p>
        </div>
        <DepartmentFormDialog mode="create" />
      </div>

      <DepartmentsTable departments={departments} />
    </div>
  )
}

export default DepartmentsPage
