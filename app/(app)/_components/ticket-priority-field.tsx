import { useState } from "react"
import type { ControllerFieldState } from "react-hook-form"
import { toast } from "sonner"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_FIELD_LABEL,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_PLACEHOLDER,
  TICKET_PRIORITY_REQUIRED_HINT,
} from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

interface TicketPriorityFieldProps {
  id: string
  name: string
  value: TicketPriority | undefined
  disabled?: boolean
  onChange: (value: TicketPriority | undefined) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
  lockedMessage?: string
}

const ticketPriorityFromValue = (value: string): TicketPriority | undefined =>
  TICKET_PRIORITIES.find((priority) => priority === value)

const TicketPriorityField = ({
  id,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  lockedMessage,
}: TicketPriorityFieldProps) => {
  const errorId = `${id}-error`
  const lockedId = `${id}-locked`
  const requiredId = `${id}-required`
  const [open, setOpen] = useState(false)
  const locked = lockedMessage !== undefined
  const showRequired = !fieldState.invalid && value === undefined
  const describedBy =
    [
      fieldState.invalid ? errorId : null,
      showRequired ? requiredId : null,
      locked ? lockedId : null,
    ]
      .filter((entry) => entry !== null)
      .join(" ") || undefined

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && lockedMessage !== undefined) {
      toast.info(lockedMessage, { id: lockedId })
      return
    }
    setOpen(nextOpen)
  }

  const handleValueChange = (next: string) => {
    if (locked) return
    onChange(ticketPriorityFromValue(next))
  }

  return (
    <Field data-invalid={fieldState.invalid} className="min-w-0 gap-1.5">
      <FieldLabel htmlFor={id}>{TICKET_PRIORITY_FIELD_LABEL}</FieldLabel>
      <Select
        name={name}
        value={value ?? ""}
        onValueChange={handleValueChange}
        disabled={disabled}
        open={open && !locked}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          onBlur={onBlur}
          aria-invalid={fieldState.invalid}
          aria-disabled={locked || undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full",
            locked && "cursor-not-allowed opacity-50 dark:hover:bg-input/30",
          )}
        >
          <SelectValue placeholder={TICKET_PRIORITY_PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent>
          {TICKET_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {TICKET_PRIORITY_LABELS[priority]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
      {showRequired ? (
        <FieldDescription id={requiredId} className="text-xs text-destructive">
          {TICKET_PRIORITY_REQUIRED_HINT}
        </FieldDescription>
      ) : null}
      {locked ? (
        <span id={lockedId} className="sr-only">
          {lockedMessage}
        </span>
      ) : null}
    </Field>
  )
}

export default TicketPriorityField
