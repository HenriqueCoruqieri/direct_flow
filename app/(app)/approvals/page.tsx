import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { requireSession } from "@/app/_lib/auth/session"
import { listPendingApprovals } from "@/app/_lib/data/approvals"
import {
  formatRangeLabel,
  resolvePeriodFilterRange,
  todayKey,
} from "@/app/_lib/date"
import {
  APPROVALS_EMPTY,
  APPROVALS_LABEL,
  APPROVALS_PATH,
  APPROVALS_PERIOD_PRESETS,
  approvalsDepartmentIdFor,
} from "@/app/_lib/domain/approvals"
import {
  approvalsHref,
  parseApprovalsPeriod,
} from "@/app/_lib/validation/approvals"

import AppTopBar from "../_components/app-top-bar"
import PeriodFilter from "../_components/period-filter"
import TicketListEmptyState from "../_components/ticket-list-empty-state"
import ApprovalsTable from "./_components/approvals-table"

export const metadata: Metadata = {
  title: APPROVALS_LABEL,
}

const ApprovalsPage = async ({ searchParams }: PageProps<"/approvals">) => {
  await requireSession()
  const facts = await getAccountFacts()
  if (!facts) notFound()

  const now = new Date()
  const period = parseApprovalsPeriod(await searchParams, todayKey(now))
  const range = resolvePeriodFilterRange(period, now)
  const departmentId = approvalsDepartmentIdFor(facts)
  const tickets =
    departmentId === null ? [] : await listPendingApprovals(departmentId, range)

  const periodFilter = (
    <PeriodFilter
      pathname={APPROVALS_PATH}
      keep={{}}
      presets={APPROVALS_PERIOD_PRESETS}
      selection={period}
    />
  )

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-title font-semibold">
            {APPROVALS_LABEL}
          </h1>
          {range !== null ? (
            <p className="text-caption text-muted-foreground">
              {formatRangeLabel(range)}
            </p>
          ) : null}
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col gap-4">
            {periodFilter}
            <TicketListEmptyState {...APPROVALS_EMPTY} />
          </div>
        ) : (
          <ApprovalsTable
            key={approvalsHref(period)}
            tickets={tickets}
            period={period}
            toolbarFooter={periodFilter}
          />
        )}
      </div>
    </>
  )
}

export default ApprovalsPage
