import type { ControllerFieldState } from "react-hook-form"

import Combobox from "@/app/_components/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import type { TagOption } from "@/app/_lib/types/tag"

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
  const options = tags.map((tag) => ({ value: tag.id, label: tag.name }))
  const showHint = !fieldState.invalid && hint !== undefined
  const visibleHintId = showHint ? hintId : undefined

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        id={id}
        ref={ref}
        options={options}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="Selecione a tag"
        searchPlaceholder="Buscar tag…"
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.invalid ? errorId : visibleHintId}
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
