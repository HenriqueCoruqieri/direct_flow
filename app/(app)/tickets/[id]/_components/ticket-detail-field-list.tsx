export const TICKET_DETAIL_FIELD_GRID_CLASS =
  "grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-1"

interface TicketDetailField {
  label: string
  value: React.ReactNode
}

interface TicketDetailFieldListProps {
  fields: TicketDetailField[]
}

const TicketDetailFieldList = ({ fields }: TicketDetailFieldListProps) => {
  return (
    <dl className={TICKET_DETAIL_FIELD_GRID_CLASS}>
      {fields.map((field) => (
        <div key={field.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs font-bold text-muted-foreground">
            {field.label}
          </dt>
          <dd className="text-sm font-medium wrap-break-word">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default TicketDetailFieldList
