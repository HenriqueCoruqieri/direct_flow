import type { ControllerFieldState } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { TICKET_ASSIGNEE_LABEL } from "@/app/_lib/domain/ticket-assignee"
import type { AssigneeOption } from "@/app/_lib/types/ticket"

import TicketAssigneeCombobox from "./ticket-assignee-combobox"

interface TicketAssigneeFieldProps {
  id: string
  value: number | null | undefined
  disabled?: boolean
  onChange: (value: number | null) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
  assignees: readonly AssigneeOption[]
  queueLabel?: string
  hint?: string
}

const TicketAssigneeField = ({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  assignees,
  queueLabel,
  hint,
}: TicketAssigneeFieldProps) => {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const showHint = !fieldState.invalid && hint !== undefined

  return (
    <Field data-invalid={fieldState.invalid} className="min-w-0 gap-1.5">
      <FieldLabel htmlFor={id}>{TICKET_ASSIGNEE_LABEL}</FieldLabel>
      <TicketAssigneeCombobox
        id={id}
        ref={ref}
        assignees={assignees}
        queueLabel={queueLabel}
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

export default TicketAssigneeField
