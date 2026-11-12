import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requireRegistryAccess } from "@/app/_lib/auth/registry-access"
import { findDepartmentDueHours } from "@/app/_lib/data/department-due-hours"
import {
  findDepartmentOption,
  listDepartmentOptions,
} from "@/app/_lib/data/departments"
import {
  canEditDepartmentDueHours,
  DUE_HOURS_ADMIN_DESCRIPTION,
  DUE_HOURS_DEPARTMENT_PARAM,
  DUE_HOURS_DIRECTOR_DESCRIPTION,
  DUE_HOURS_PAGE_TITLE,
  dueHoursDepartmentIdFor,
  dueHoursDepartmentOptions,
  dueHoursViewFor,
} from "@/app/_lib/domain/department-due-hours"
import { isDirectorAccess } from "@/app/_lib/domain/registry"
import type { DepartmentOption } from "@/app/_lib/types/department"
import { dueHoursSearchParamsSchema } from "@/app/_lib/validation/department-due-hours"

import DueHoursDepartmentFilter from "./_components/due-hours-department-filter"
import DueHoursForm from "./_components/due-hours-form"
import DueHoursStatus from "./_components/due-hours-status"

export const metadata: Metadata = {
  title: DUE_HOURS_PAGE_TITLE,
}

const NO_DEPARTMENT_OPTIONS: DepartmentOption[] = []

const DueHoursPage = async ({
  searchParams,
}: PageProps<"/registry/due-hours">) => {
  const access = await requireRegistryAccess()
  const isDirector = isDirectorAccess(access)
  const params = dueHoursSearchParamsSchema.parse(await searchParams)
  const options = dueHoursDepartmentOptions(
    access,
    isDirector ? await listDepartmentOptions() : NO_DEPARTMENT_OPTIONS,
  )
  const departmentId = dueHoursDepartmentIdFor(
    access,
    params[DUE_HOURS_DEPARTMENT_PARAM] ?? null,
    options,
  )
  if (departmentId === null) notFound()

  const [target, record] = await Promise.all([
    findDepartmentOption(departmentId),
    findDepartmentDueHours(departmentId),
  ])
  if (!target) notFound()

  const view = dueHoursViewFor(record)
  const canEdit = canEditDepartmentDueHours(access, target)

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">
            {DUE_HOURS_PAGE_TITLE}
          </h1>
          <p className="text-caption text-muted-foreground">
            {isDirector
              ? DUE_HOURS_DIRECTOR_DESCRIPTION
              : DUE_HOURS_ADMIN_DESCRIPTION}
          </p>
        </div>
        {options.length > 0 ? (
          <DueHoursDepartmentFilter
            access={access}
            options={options}
            value={target.id}
          />
        ) : null}
      </div>

      <DueHoursForm
        key={`${target.id}-${view.lastChange ?? "default"}`}
        departmentId={target.id}
        departmentName={target.name}
        hours={view.hours}
        canEdit={canEdit}
        status={<DueHoursStatus view={view} />}
      />
    </div>
  )
}

export default DueHoursPage
