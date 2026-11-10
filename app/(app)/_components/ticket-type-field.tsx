import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import type { TicketType } from "@/app/_lib/types/ticket"

import TicketTypeSelect from "./ticket-type-select"

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
      <TicketTypeSelect
        ref={ref}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.invalid ? errorId : undefined}
        aria-required={undefined}
        aria-labelledby={undefined}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
    </Field>
  )
}

export default TicketTypeField
