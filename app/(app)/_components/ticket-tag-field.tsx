import type { ControllerFieldState } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import type { TagOption } from "@/app/_lib/types/tag"

import TicketTagCombobox from "./ticket-tag-combobox"

interface TicketTagFieldProps {
  id: string
  label: string
  value: number | undefined
  disabled?: boolean
  onChange: (value: number) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
  tags: readonly TagOption[]
  hint?: string
}

const TicketTagField = ({
  id,
  label,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  tags,
  hint,
}: TicketTagFieldProps) => {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const showHint = !fieldState.invalid && hint !== undefined

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TicketTagCombobox
        id={id}
        ref={ref}
        tags={tags}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        aria-describedby={
          fieldState.invalid ? errorId : showHint ? hintId : undefined
        }
        aria-required={undefined}
        aria-labelledby={undefined}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
      {showHint ? (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  )
}

export default TicketTagField
