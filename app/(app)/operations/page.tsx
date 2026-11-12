import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import DepartmentFilter from "@/app/_components/department-filter"
import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession } from "@/app/_lib/auth/session"
import { findDepartmentGoals } from "@/app/_lib/data/department-goals"
import {
  findDepartmentOption,
  listDepartmentOptions,
} from "@/app/_lib/data/departments"
import { formatRangeLabel, resolvePeriodRange, todayKey } from "@/app/_lib/date"
import { goalsLastChangeLabel } from "@/app/_lib/domain/department-goals"
import {
  applicableOperationsDepartmentId,
  canEditDepartmentGoals,
  goalsUndefinedCopy,
  hasOperations,
  OPERATIONS_DEPARTMENT_FILTER_LABEL,
  OPERATIONS_LABEL,
  OPERATIONS_UNASSIGNED_MESSAGE,
  operationsDepartmentIdFor,
  operationsDepartmentOptions,
  operationsDepartmentParamFor,
  operationsSubtitle,
  usesOperationsDepartment,
  usesOperationsPeriod,
} from "@/app/_lib/domain/operations"
import type { OperationsLocation } from "@/app/_lib/types/operations"
import type { TicketViewerFacts } from "@/app/_lib/types/ticket"
import {
  operationsCanonicalHref,
  operationsHref,
  parseOperationsParams,
  serializeOperationsParams,
} from "@/app/_lib/validation/operations"

import AppTopBar from "../_components/app-top-bar"
import TicketListEmptyState from "../_components/ticket-list-empty-state"
import DepartmentGoalsDialog from "./_components/department-goals-dialog"
import GoalsEmptyState from "./_components/goals-empty-state"
import MyGoalSection from "./_components/my-goal-section"
import OperationsHeader from "./_components/operations-header"
import OperationsPeriodFilter from "./_components/operations-period-filter"
import OperationsTabSkeleton from "./_components/operations-tab-skeleton"
import ProductionSection from "./_components/production-section"
import TeamGoalSection from "./_components/team-goal-section"

export const metadata: Metadata = {
  title: OPERATIONS_LABEL,
}

const OperationsPage = async ({ searchParams }: PageProps<"/operations">) => {
  const actor = await requireSession()
  const facts = await getAccountFacts()
  if (!facts) notFound()

  if (!hasOperations(facts)) {
    return (
      <>
        <AppTopBar />
        <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
          <h1 className="font-heading text-title font-semibold">
            {OPERATIONS_LABEL}
          </h1>
          <TicketListEmptyState description={OPERATIONS_UNASSIGNED_MESSAGE} />
        </div>
      </>
    )
  }

  const viewer: TicketViewerFacts = {
    userId: actor.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
  }
  const raw = await searchParams
  const now = new Date()
  const requested = parseOperationsParams(raw, todayKey(now))
  const departmentOptions = viewer.isBoard
    ? operationsDepartmentOptions(viewer, await listDepartmentOptions())
    : []
  const location: OperationsLocation = {
    ...requested,
    departmentId: applicableOperationsDepartmentId(
      viewer,
      requested.departmentId,
      departmentOptions,
    ),
  }
  const canonicalHref = operationsCanonicalHref(raw, location)
  if (canonicalHref !== null) redirect(canonicalHref)

  const departmentId = usesOperationsDepartment(location.tab)
    ? operationsDepartmentIdFor(viewer, location.departmentId)
    : viewer.departmentId
  const showDepartmentFilter =
    departmentOptions.length > 0 && usesOperationsDepartment(location.tab)
  const isProduction = usesOperationsPeriod(location.tab)

  const [target, access, goals] = await Promise.all([
    findDepartmentOption(departmentId),
    getRegistryAccess(),
    isProduction ? null : findDepartmentGoals(departmentId),
  ])
  if (!target) notFound()

  const canEdit = canEditDepartmentGoals(access, target)
  const range = resolvePeriodRange(location.period, now)
  const subtitle = isProduction
    ? formatRangeLabel(range)
    : operationsSubtitle(target.name, goals, now)
  const periodFilter = isProduction ? (
    <OperationsPeriodFilter location={location} />
  ) : null
  const suspenseKey = serializeOperationsParams(location)

  const goalsDialog = canEdit ? (
    <DepartmentGoalsDialog
      departmentId={target.id}
      departmentName={target.name}
      goals={goals}
      lastChange={goals === null ? null : goalsLastChangeLabel(goals)}
    />
  ) : null

  const content = isProduction ? (
    <Suspense
      key={suspenseKey}
      fallback={
        <OperationsTabSkeleton tab={location.tab} filter={periodFilter} />
      }
    >
      <ProductionSection
        departmentId={departmentId}
        sessionUserId={actor.id}
        range={range}
        filter={periodFilter}
      />
    </Suspense>
  ) : goals === null ? (
    <GoalsEmptyState copy={goalsUndefinedCopy(canEdit)} action={goalsDialog} />
  ) : (
    <Suspense
      key={suspenseKey}
      fallback={<OperationsTabSkeleton tab={location.tab} />}
    >
      {location.tab === "time" ? (
        <TeamGoalSection departmentId={departmentId} goals={goals} now={now} />
      ) : (
        <MyGoalSection
          departmentId={departmentId}
          userId={actor.id}
          goals={goals}
          now={now}
        />
      )}
    </Suspense>
  )

  const showEditButton = goalsDialog !== null && goals !== null
  const actions =
    showDepartmentFilter || showEditButton ? (
      <>
        {showDepartmentFilter ? (
          <DepartmentFilter
            label={OPERATIONS_DEPARTMENT_FILTER_LABEL}
            options={departmentOptions.map((option) => ({
              id: option.id,
              name: option.name,
              href: operationsHref({
                ...location,
                departmentId: operationsDepartmentParamFor(viewer, option.id),
              }),
            }))}
            value={departmentId}
          />
        ) : null}
        {showEditButton ? goalsDialog : null}
      </>
    ) : null

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <OperationsHeader
          location={location}
          now={now}
          subtitle={subtitle}
          actions={actions}
        />
        {content}
      </div>
    </>
  )
}

export default OperationsPage
