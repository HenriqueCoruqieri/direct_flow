import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_FIELD_LABEL,
  TICKET_PRIORITY_LABELS,
} from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"

interface TicketPriorityFieldProps {
  id: string
  name: string
  value: TicketPriority | undefined
  disabled?: boolean
  onChange: (value: TicketPriority | undefined) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}

const ticketPriorityFromValue = (value: string): TicketPriority | undefined =>
  TICKET_PRIORITIES.find((priority) => priority === value)

const TicketPriorityField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
}: TicketPriorityFieldProps) => {
  const errorId = `${id}-error`

  return (
    <Field data-invalid={fieldState.invalid} className="min-w-0 gap-1.5">
      <FieldLabel htmlFor={id}>{TICKET_PRIORITY_FIELD_LABEL}</FieldLabel>
      <Select
        name={name}
        value={value ?? ""}
        onValueChange={(next) => onChange(ticketPriorityFromValue(next))}
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          onBlur={onBlur}
          aria-invalid={fieldState.invalid}
          aria-describedby={fieldState.invalid ? errorId : undefined}
          className="w-full"
        >
          <SelectValue placeholder="Selecione a prioridade" />
        </SelectTrigger>
        <SelectContent>
          {TICKET_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {TICKET_PRIORITY_LABELS[priority]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
    </Field>
  )
}

export default TicketPriorityField
