import { formatDateTime, toISO } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import { TICKET_TYPE_LABELS } from "@/app/_lib/domain/ticket"
import type { TicketDetail } from "@/app/_lib/types/ticket"

import TicketDetailFieldList from "./ticket-detail-field-list"
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
            { label: "Aberto por", value: ticket.authorName },
            {
              label: "Responsável",
              value: ticket.assigneeName ?? EMPTY_VALUE_LABEL,
            },
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
