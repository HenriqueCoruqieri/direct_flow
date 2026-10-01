"use client"

import { useId, useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover"

import NewTicketButton from "./new-ticket-button"

interface NewTicketBlockedButtonProps {
  message: string
}

const NewTicketBlockedButton = ({ message }: NewTicketBlockedButtonProps) => {
  const messageId = useId()
  const [open, setOpen] = useState(false)

  const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.matches(":focus-visible")) setOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <NewTicketButton
          blocked
          aria-describedby={messageId}
          onFocus={handleFocus}
        />
      </PopoverTrigger>
      <span id={messageId} className="sr-only">
        {message}
      </span>
      <PopoverContent
        align="end"
        aria-label="Por que não é possível abrir chamados"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="text-pretty"
      >
        <p>{message}</p>
      </PopoverContent>
    </Popover>
  )
}

export default NewTicketBlockedButton
