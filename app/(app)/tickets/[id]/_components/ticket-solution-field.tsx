import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"

import TicketSolutionTextarea from "./ticket-solution-textarea"

interface TicketSolutionFieldProps {
  id: string
  name: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
  fieldState: ControllerFieldState
}

const TicketSolutionField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
}: TicketSolutionFieldProps) => {
  const errorId = `${id}-error`

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id}>Solução</FieldLabel>
      <TicketSolutionTextarea
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

export default TicketSolutionField
