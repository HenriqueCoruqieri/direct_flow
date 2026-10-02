"use client"

import { Slot } from "radix-ui"
import { useId } from "react"
import { toast } from "sonner"

interface BlockedActionTriggerProps {
  message: string
  children: React.ReactElement
}

const BlockedActionTrigger = ({
  message,
  children,
}: BlockedActionTriggerProps) => {
  const messageId = useId()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    toast.info(message, { id: messageId })
  }

  return (
    <>
      <Slot.Root aria-describedby={messageId} onClick={handleClick}>
        {children}
      </Slot.Root>
      <span id={messageId} className="sr-only">
        {message}
      </span>
    </>
  )
}

export default BlockedActionTrigger
