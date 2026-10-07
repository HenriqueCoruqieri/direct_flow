import { formatDateTime, toISO } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import { TICKET_TYPE_LABELS } from "@/app/_lib/domain/ticket"
import {
  describeTicketAssignee,
  TICKET_ASSIGNEE_LABEL,
  TICKET_CREATOR_LABEL,
} from "@/app/_lib/domain/ticket-assignee"
import type { TicketDetail } from "@/app/_lib/types/ticket"

import TicketDetailFieldList from "./ticket-detail-field-list"
import TicketEditAssignee from "./ticket-edit-assignee"
import TicketEditClassification from "./ticket-edit-classification"

interface TicketDetailFieldsProps {
  ticket: TicketDetail
  editable?: boolean
}

const TicketDetailFields = ({
  ticket,
  editable = false,
}: TicketDetailFieldsProps) => {
  const classification = (
    <TicketDetailFieldList
      fields={[
        { label: "Tipo", value: TICKET_TYPE_LABELS[ticket.type] },
        { label: "Tag", value: ticket.tagName ?? EMPTY_VALUE_LABEL },
      ]}
    />
  )

  const assignment = (
    <TicketDetailFieldList
      fields={[
        { label: TICKET_CREATOR_LABEL, value: ticket.authorName },
        {
          label: TICKET_ASSIGNEE_LABEL,
          value: describeTicketAssignee(
            ticket.assigneeName,
            ticket.currentDepartmentName,
          ),
        },
      ]}
    />
  )

  return (
    <section
      aria-labelledby="ticket-fields-heading"
      className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <h2
        id="ticket-fields-heading"
        className="font-heading text-base font-semibold"
      >
        Detalhes
      </h2>
      <div className="flex flex-col gap-3.5">
        {editable ? (
          <TicketEditClassification>{classification}</TicketEditClassification>
        ) : (
          classification
        )}
        <TicketDetailFieldList
          fields={[
            { label: "Setor de origem", value: ticket.originDepartmentName },
            { label: "Setor atual", value: ticket.currentDepartmentName },
          ]}
        />
        {editable ? (
          <TicketEditAssignee creatorName={ticket.authorName}>
            {assignment}
          </TicketEditAssignee>
        ) : (
          assignment
        )}
        <TicketDetailFieldList
          fields={[
            {
              label: "Aberto em",
              value: (
                <time
                  dateTime={toISO(ticket.createdAt)}
                  className="tabular-nums"
                >
                  {formatDateTime(ticket.createdAt)}
                </time>
              ),
            },
          ]}
        />
      </div>
    </section>
  )
}

export default TicketDetailFields
