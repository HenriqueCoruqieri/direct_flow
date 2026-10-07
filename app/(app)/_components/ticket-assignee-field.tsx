import ComboboxField, {
  type ComboboxFieldProps,
} from "@/app/_components/combobox-field"
import { TICKET_ASSIGNEE_LABEL } from "@/app/_lib/domain/ticket-assignee"
import type { AssigneeOption } from "@/app/_lib/types/ticket"

interface TicketAssigneeFieldProps extends Omit<
  ComboboxFieldProps<string>,
  | "label"
  | "value"
  | "onChange"
  | "options"
  | "placeholder"
  | "searchPlaceholder"
  | "className"
> {
  assignees: readonly AssigneeOption[]
  queueLabel?: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}

interface AssigneeChoice {
  key: string
  assigneeId: number | null
  label: string
}

const QUEUE_CHOICE_KEY = "queue"

const buildAssigneeChoices = (
  assignees: readonly AssigneeOption[],
  queueLabel: string | undefined,
): AssigneeChoice[] => {
  const people = assignees.map((assignee) => ({
    key: String(assignee.id),
    assigneeId: assignee.id,
    label: assignee.name,
  }))
  if (queueLabel === undefined) return people
  return [
    { key: QUEUE_CHOICE_KEY, assigneeId: null, label: queueLabel },
    ...people,
  ]
}

const TicketAssigneeField = ({
  assignees,
  queueLabel,
  value,
  onChange,
  ...props
}: TicketAssigneeFieldProps) => {
  const choices = buildAssigneeChoices(assignees, queueLabel)
  const selectedKey = choices.find((choice) => choice.assigneeId === value)?.key

  const handleChange = (key: string) => {
    const choice = choices.find((item) => item.key === key)
    if (choice !== undefined) onChange(choice.assigneeId)
  }

  return (
    <ComboboxField
      {...props}
      label={TICKET_ASSIGNEE_LABEL}
      value={selectedKey}
      onChange={handleChange}
      options={choices.map((choice) => ({
        value: choice.key,
        label: choice.label,
      }))}
      placeholder="Selecione o destinatário"
      searchPlaceholder="Buscar pessoa…"
      className="min-w-0"
    />
  )
}

export default TicketAssigneeField
