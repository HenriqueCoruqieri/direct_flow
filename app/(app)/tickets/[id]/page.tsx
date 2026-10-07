import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { requireSession } from "@/app/_lib/auth/session"
import { listTicketAssigneeOptions } from "@/app/_lib/data/people"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { listTicketMessages } from "@/app/_lib/data/ticket-messages"
import { findTicketDetail } from "@/app/_lib/data/tickets"
import { MY_TICKETS_LABEL, MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import { canViewTicket, formatTicketNumber } from "@/app/_lib/domain/ticket"
import {
  canEditTicketComment,
  ticketCommentFormStateFor,
  ticketMessageScopeFor,
} from "@/app/_lib/domain/ticket-comments"
import {
  buildTicketEditFormOptions,
  ticketEditButtonStateFor,
} from "@/app/_lib/domain/ticket-edit"
import { ticketConclusionStateFor } from "@/app/_lib/domain/ticket-resolution"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import { parseTicketIdParam } from "@/app/_lib/validation/ticket"

import AppTopBar from "../../_components/app-top-bar"
import EditTicketBlockedButton from "./_components/edit-ticket-blocked-button"
import PendingTransferNotice from "./_components/pending-transfer-notice"
import TicketComments from "./_components/ticket-comments"
import TicketConclusion from "./_components/ticket-conclusion"
import TicketDescription from "./_components/ticket-description"
import TicketDetailFields from "./_components/ticket-detail-fields"
import TicketDetailHeader from "./_components/ticket-detail-header"
import TicketEditProvider from "./_components/ticket-edit-provider"
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
  const session = await requireSession()
  const id = parseTicketIdParam((await params).id)
  if (id === null) notFound()

  const [facts, ticket] = await Promise.all([
    getAccountFacts(),
    findTicketDetail(id),
  ])
  if (!facts || !ticket) notFound()

  const actor: TicketActorFacts = {
    userId: session.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
    role: facts.role,
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
  if (!canViewTicket(actor, ticket)) notFound()

  const now = new Date()
  const editButton = ticketEditButtonStateFor(actor, ticket, now)
  const conclusion = ticketConclusionStateFor(actor, ticket, now)
  const commentForm = ticketCommentFormStateFor(actor, ticket, now)

  const isEditable = editButton.state === "editable"
  const [messages, editTags, editAssignees] = await Promise.all([
    listTicketMessages(ticket.id, ticketMessageScopeFor(actor, ticket)),
    isEditable ? listActiveDepartmentTags(facts.departmentId) : null,
    isEditable ? listTicketAssigneeOptions(facts.departmentId) : null,
  ])

  const editOptions =
    editTags !== null && editAssignees !== null
      ? buildTicketEditFormOptions(ticket, editTags, editAssignees)
      : null
  const editable = editOptions !== null
  const commentEntries = messages.map((message) => ({
    message,
    canEdit: canEditTicketComment(actor, ticket, message, now),
  }))

  const content = (
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
          editable={editable}
          action={
            editButton.state === "blocked" ? (
              <EditTicketBlockedButton message={editButton.message} />
            ) : undefined
          }
        />
      </div>

      {ticket.pendingTransfer !== null ? (
        <PendingTransferNotice transfer={ticket.pendingTransfer} />
      ) : null}

      <div className="grid grid-cols-1 gap-5.5 lg:grid-cols-3 lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-5.5 lg:col-span-2">
          <TicketDescription
            description={ticket.description}
            editable={editable}
          />
          <TicketTimeline entries={ticket.history} />
          <TicketConclusion
            ticketId={ticket.id}
            state={conclusion}
            editable={editable}
            className="lg:flex-1"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-5.5">
          <TicketDetailFields ticket={ticket} editable={editable} />
          <TicketComments
            ticketId={ticket.id}
            entries={commentEntries}
            form={commentForm}
            className="lg:flex-1"
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <AppTopBar />
      {editOptions !== null ? (
        <TicketEditProvider options={editOptions}>{content}</TicketEditProvider>
      ) : (
        content
      )}
    </>
  )
}

export default TicketDetailPage
