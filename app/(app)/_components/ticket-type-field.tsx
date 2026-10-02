import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { TICKET_TYPE_LABELS, TICKET_TYPES } from "@/app/_lib/domain/ticket"
import type { TicketType } from "@/app/_lib/types/ticket"

interface TicketTypeFieldProps {
  id: string
  name: string
  value: TicketType | undefined
  disabled?: boolean
  onChange: (value: TicketType | undefined) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}

const ticketTypeFromValue = (value: string): TicketType | undefined =>
  TICKET_TYPES.find((type) => type === value)

const TicketTypeField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
}: TicketTypeFieldProps) => {
  const errorId = `${id}-error`

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id}>Tipo</FieldLabel>
      <Select
        name={name}
        value={value ?? ""}
        onValueChange={(next) => onChange(ticketTypeFromValue(next))}
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
          <SelectValue placeholder="Selecione o tipo" />
        </SelectTrigger>
        <SelectContent>
          {TICKET_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {TICKET_TYPE_LABELS[type]}
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

export default TicketTypeField
