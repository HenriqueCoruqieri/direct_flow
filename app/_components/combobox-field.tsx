import type { ControllerFieldState } from "react-hook-form"

import Combobox, { type ComboboxOption } from "@/app/_components/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { cn } from "@/app/_lib/utils"

export interface ComboboxFieldProps<TValue extends string | number> {
  id: string
  label: string
  value: TValue | undefined
  disabled?: boolean
  onChange: (value: TValue) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
  options: ComboboxOption<TValue>[]
  placeholder: string
  searchPlaceholder: string
  hint?: string
  className?: string
}

const ComboboxField = <TValue extends string | number>({
  id,
  label,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  options,
  placeholder,
  searchPlaceholder,
  hint,
  className,
}: ComboboxFieldProps<TValue>) => {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const showHint = !fieldState.invalid && hint !== undefined
  const visibleHintId = showHint ? hintId : undefined

  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn("gap-1.5", className)}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        id={id}
        ref={ref}
        options={options}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
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

export default ComboboxField
