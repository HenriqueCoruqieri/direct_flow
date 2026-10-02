import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"

interface TicketTitleFieldProps {
  id: string
  name: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLInputElement>
  fieldState: ControllerFieldState
}

const TicketTitleField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
}: TicketTitleFieldProps) => {
  const errorId = `${id}-error`

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id}>Título</FieldLabel>
      <Input
        ref={ref}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete="off"
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.invalid ? errorId : undefined}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
    </Field>
  )
}

export default TicketTitleField
