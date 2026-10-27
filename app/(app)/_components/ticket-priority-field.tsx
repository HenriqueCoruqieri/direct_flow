import type { ControllerFieldState } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
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
  TICKET_PRIORITY_PLACEHOLDER,
  TICKET_PRIORITY_REQUIRED_HINT,
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
  hint?: string
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
  hint,
}: TicketPriorityFieldProps) => {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const showHint = !fieldState.invalid && hint !== undefined
  const requiredId = `${id}-required`
  const showRequired = !fieldState.invalid && value === undefined
  const describedBy = fieldState.invalid
    ? errorId
    : showRequired
      ? requiredId
      : showHint
        ? hintId
        : undefined

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
          aria-describedby={describedBy}
          className="w-full"
        >
          <SelectValue placeholder={TICKET_PRIORITY_PLACEHOLDER} />
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
      {showRequired ? (
        <FieldDescription id={requiredId} className="text-xs text-destructive">
          {TICKET_PRIORITY_REQUIRED_HINT}
        </FieldDescription>
      ) : null}
      {showHint && !showRequired ? (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  )
}

export default TicketPriorityField
