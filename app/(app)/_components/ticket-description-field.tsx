import type { ControllerFieldState } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"

import TicketDescriptionTextarea from "./ticket-description-textarea"

interface TicketDescriptionFieldProps {
  id: string
  name: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
  fieldState: ControllerFieldState
  hideLabel?: boolean
}

const TicketDescriptionField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  hideLabel = false,
}: TicketDescriptionFieldProps) => {
  const errorId = `${id}-error`

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        Descrição
      </FieldLabel>
      <TicketDescriptionTextarea
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

export default TicketDescriptionField
