import { formatDateTime, toISO } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import { TICKET_TYPE_LABELS } from "@/app/_lib/domain/ticket"
import type { TicketDetail } from "@/app/_lib/types/ticket"

interface TicketDetailField {
  label: string
  value: React.ReactNode
}

interface TicketDetailFieldsProps {
  ticket: TicketDetail
}

const TicketDetailFields = ({ ticket }: TicketDetailFieldsProps) => {
  const fields: TicketDetailField[] = [
    { label: "Tipo", value: TICKET_TYPE_LABELS[ticket.type] },
    { label: "Tag", value: ticket.tagName ?? EMPTY_VALUE_LABEL },
    { label: "Setor de origem", value: ticket.originDepartmentName },
    { label: "Setor atual", value: ticket.currentDepartmentName },
    { label: "Aberto por", value: ticket.authorName },
    { label: "Responsável", value: ticket.assigneeName ?? EMPTY_VALUE_LABEL },
    {
      label: "Aberto em",
      value: (
        <time dateTime={toISO(ticket.createdAt)} className="tabular-nums">
          {formatDateTime(ticket.createdAt)}
        </time>
      ),
    },
  ]

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
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-1">
        {fields.map((field) => (
          <div key={field.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs font-bold text-muted-foreground">
              {field.label}
            </dt>
            <dd className="text-sm font-medium wrap-break-word">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default TicketDetailFields
