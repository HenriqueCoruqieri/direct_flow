import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { requireSession } from "@/app/_lib/auth/session"
import {
  countQueueTicketsByTab,
  listQueueTickets,
} from "@/app/_lib/data/department-queue"
import { listDepartmentOptions } from "@/app/_lib/data/departments"
import { listTicketAssigneeOptions } from "@/app/_lib/data/people"
import {
  formatRangeLabel,
  resolvePeriodFilterRange,
  todayKey,
} from "@/app/_lib/date"
import {
  applicableQueueDepartmentId,
  DEPARTMENT_QUEUE_LABEL,
  DEPARTMENT_QUEUE_TAB_RULES,
  DEPARTMENT_QUEUE_TABS,
  DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE,
  departmentQueueEmptyCopy,
  hasDepartmentQueue,
  queueDepartmentIdFor,
  queueDepartmentOptions,
} from "@/app/_lib/domain/department-queue"
import { isTicketDispatcher } from "@/app/_lib/domain/ticket-assignment"
import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import {
  departmentQueueHref,
  parseDepartmentQueueParams,
} from "@/app/_lib/validation/department-queue"

import AppTopBar from "../_components/app-top-bar"
import TicketListEmptyState from "../_components/ticket-list-empty-state"
import TicketListTabs from "../_components/ticket-list-tabs"
import DepartmentQueueTable from "./_components/department-queue-table"
import QueueListFilters from "./_components/queue-list-filters"

export const metadata: Metadata = {
  title: DEPARTMENT_QUEUE_LABEL,
}

const DepartmentQueuePage = async ({ searchParams }: PageProps<"/queue">) => {
  const actor = await requireSession()
  const facts = await getAccountFacts()
  if (!facts) notFound()

  if (!hasDepartmentQueue(facts)) {
    return (
      <>
        <AppTopBar />
        <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
          <h1 className="font-heading text-title font-semibold">
            {DEPARTMENT_QUEUE_LABEL}
          </h1>
          <TicketListEmptyState
            description={DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE}
          />
        </div>
      </>
    )
  }

  const viewer: TicketActorFacts = {
    userId: actor.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
    role: facts.role,
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
  const raw = await searchParams
  const now = new Date()
  const requested = parseDepartmentQueueParams(raw, todayKey(now))
  const departmentOptions = viewer.isBoard
    ? queueDepartmentOptions(viewer, await listDepartmentOptions())
    : []
  const location: DepartmentQueueLocation = {
    ...requested,
    departmentId: applicableQueueDepartmentId(
      viewer,
      requested.departmentId,
      departmentOptions,
    ),
  }
  const departmentId = queueDepartmentIdFor(viewer, location.departmentId)
  const range = resolvePeriodFilterRange(location.period, now)
  const [tickets, counts, assignees] = await Promise.all([
    listQueueTickets(departmentId, location.tab, range),
    countQueueTicketsByTab(departmentId, range),
    isTicketDispatcher(viewer, departmentId)
      ? listTicketAssigneeOptions(departmentId)
      : [],
  ])

  const toolbarFooter = (
    <QueueListFilters
      viewer={viewer}
      location={location}
      departmentOptions={departmentOptions}
      departmentId={departmentId}
    />
  )

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-heading text-title font-semibold">
              {DEPARTMENT_QUEUE_LABEL}
            </h1>
            {range !== null ? (
              <p className="text-caption text-muted-foreground">
                {formatRangeLabel(range)}
              </p>
            ) : null}
          </div>
          <TicketListTabs
            ariaLabel="Abas da Fila do setor"
            current={location.tab}
            items={DEPARTMENT_QUEUE_TABS.map((tab) => ({
              value: tab,
              label: DEPARTMENT_QUEUE_TAB_RULES[tab].label,
              count: counts[tab],
              href: departmentQueueHref({ ...location, tab }),
            }))}
          />
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col gap-4">
            {toolbarFooter}
            <TicketListEmptyState
              {...departmentQueueEmptyCopy(location.tab, location.period)}
            />
          </div>
        ) : (
          <DepartmentQueueTable
            key={departmentQueueHref(location)}
            tab={location.tab}
            tickets={tickets}
            viewer={viewer}
            assignees={assignees}
            toolbarFooter={toolbarFooter}
          />
        )}
      </div>
    </>
  )
}

export default DepartmentQueuePage
