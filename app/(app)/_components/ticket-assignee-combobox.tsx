import Combobox from "@/app/_components/combobox"
import type { FormFieldA11yProps } from "@/app/_components/form-field"
import type { AssigneeOption } from "@/app/_lib/types/ticket"

interface TicketAssigneeComboboxProps extends FormFieldA11yProps {
  value: number | null | undefined
  disabled?: boolean
  onChange: (value: number | null) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  assignees: readonly AssigneeOption[]
  queueLabel?: string
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

const TicketAssigneeCombobox = ({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  assignees,
  queueLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-labelledby": ariaLabelledBy,
}: TicketAssigneeComboboxProps) => {
  const choices = buildAssigneeChoices(assignees, queueLabel)
  const selectedKey = choices.find((choice) => choice.assigneeId === value)?.key

  const handleChange = (key: string) => {
    const choice = choices.find((item) => item.key === key)
    if (choice !== undefined) onChange(choice.assigneeId)
  }

  return (
    <Combobox
      id={id}
      ref={ref}
      options={choices.map((choice) => ({
        value: choice.key,
        label: choice.label,
      }))}
      value={selectedKey}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder="Selecione o destinatário"
      searchPlaceholder="Buscar pessoa…"
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      aria-required={ariaRequired}
      aria-labelledby={ariaLabelledBy}
    />
  )
}

export default TicketAssigneeCombobox
