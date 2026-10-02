import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { requireSession } from "@/app/_lib/auth/session"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { findTicketDetail } from "@/app/_lib/data/tickets"
import { MY_TICKETS_LABEL, MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import { canViewTicket, formatTicketNumber } from "@/app/_lib/domain/ticket"
import {
  buildTicketEditFormOptions,
  ticketEditButtonStateFor,
} from "@/app/_lib/domain/ticket-edit"
import type { TicketEditorFacts } from "@/app/_lib/types/ticket-edit"
import { parseTicketIdParam } from "@/app/_lib/validation/ticket"

import AppTopBar from "../../_components/app-top-bar"
import EditTicketBlockedButton from "./_components/edit-ticket-blocked-button"
import EditTicketDialog from "./_components/edit-ticket-dialog"
import PendingTransferNotice from "./_components/pending-transfer-notice"
import TicketDescription from "./_components/ticket-description"
import TicketDetailFields from "./_components/ticket-detail-fields"
import TicketDetailHeader from "./_components/ticket-detail-header"
import TicketTimeline from "./_components/ticket-timeline"

export const generateMetadata = async ({
  params,
}: PageProps<"/tickets/[id]">): Promise<Metadata> => {
  const id = parseTicketIdParam((await params).id)

  return {
    title: id === null ? "Chamado" : `Chamado ${formatTicketNumber(id)}`,
  }
}

const TicketDetailPage = async ({ params }: PageProps<"/tickets/[id]">) => {
  const actor = await requireSession()
  const id = parseTicketIdParam((await params).id)
  if (id === null) notFound()

  const [facts, ticket] = await Promise.all([
    getAccountFacts(),
    findTicketDetail(id),
  ])
  if (!facts || !ticket) notFound()

  const editor: TicketEditorFacts = {
    userId: actor.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
  if (!canViewTicket(editor, ticket)) notFound()

  const editButton = ticketEditButtonStateFor(editor, ticket)
  const editAction =
    editButton.state === "editable" ? (
      <EditTicketDialog
        options={buildTicketEditFormOptions(
          ticket,
          await listActiveDepartmentTags(facts.departmentId),
        )}
      />
    ) : editButton.state === "blocked" ? (
      <EditTicketBlockedButton message={editButton.message} />
    ) : undefined

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-col gap-3.5">
          <Link
            href={MY_TICKETS_PATH}
            className="inline-flex w-fit items-center gap-1.5 rounded-md text-caption font-semibold text-text-tertiary transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {MY_TICKETS_LABEL}
          </Link>
          <TicketDetailHeader
            id={ticket.id}
            title={ticket.title}
            status={ticket.status}
            priority={ticket.priority}
            action={editAction}
          />
        </div>

        {ticket.pendingTransfer !== null ? (
          <PendingTransferNotice transfer={ticket.pendingTransfer} />
        ) : null}

        <div className="grid grid-cols-1 gap-5.5 lg:grid-cols-3 lg:items-start">
          <div className="flex min-w-0 flex-col gap-5.5 lg:col-span-2">
            <TicketDescription description={ticket.description} />
            <TicketTimeline entries={ticket.history} />
          </div>
          <TicketDetailFields ticket={ticket} />
        </div>
      </div>
    </>
  )
}

export default TicketDetailPage
