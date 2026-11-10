import { useState } from "react"
import { toast } from "sonner"

import type { FormFieldA11yProps } from "@/app/_components/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_PLACEHOLDER,
} from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

interface TicketPrioritySelectProps extends FormFieldA11yProps {
  name?: string
  value: TicketPriority | undefined
  disabled?: boolean
  onChange: (value: TicketPriority | undefined) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  lockedMessage?: string
}

const ticketPriorityFromValue = (value: string): TicketPriority | undefined =>
  TICKET_PRIORITIES.find((priority) => priority === value)

const TicketPrioritySelect = ({
  name,
  value,
  disabled,
  onChange,
  lockedMessage,
  "aria-describedby": ariaDescribedBy,
  ...trigger
}: TicketPrioritySelectProps) => {
  const lockedId = `${trigger.id}-locked`
  const [open, setOpen] = useState(false)
  const locked = lockedMessage !== undefined
  const describedBy =
    [ariaDescribedBy, locked ? lockedId : undefined]
      .filter((entry) => entry !== undefined)
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
    <>
      <Select
        name={name}
        value={value ?? ""}
        onValueChange={handleValueChange}
        disabled={disabled}
        open={open && !locked}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger
          {...trigger}
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
      {locked ? (
        <span id={lockedId} className="sr-only">
          {lockedMessage}
        </span>
      ) : null}
    </>
  )
}

export default TicketPrioritySelect
