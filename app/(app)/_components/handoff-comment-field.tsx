import type { ControllerFieldState } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { Textarea } from "@/app/_components/ui/textarea"
import {
  HANDOFF_COMMENT_LABEL,
  HANDOFF_COMMENT_PLACEHOLDER,
} from "@/app/_lib/domain/ticket-handoff"
import { cn } from "@/app/_lib/utils"

interface HandoffCommentFieldProps {
  id: string
  name: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
  fieldState: ControllerFieldState
  description?: string
  className?: string
}

const HandoffCommentField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  description,
  className,
}: HandoffCommentFieldProps) => {
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = [
    description === undefined ? null : descriptionId,
    fieldState.invalid ? errorId : null,
  ]
    .filter((part) => part !== null)
    .join(" ")

  return (
    <Field
      data-invalid={fieldState.invalid}
      className={cn("min-w-0 gap-1.5", className)}
    >
      <FieldLabel htmlFor={id}>{HANDOFF_COMMENT_LABEL}</FieldLabel>
      {description === undefined ? null : (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      <Textarea
        ref={ref}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={HANDOFF_COMMENT_PLACEHOLDER}
        rows={4}
        className="max-h-60 min-h-24"
        aria-invalid={fieldState.invalid}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
    </Field>
  )
}

export default HandoffCommentField
