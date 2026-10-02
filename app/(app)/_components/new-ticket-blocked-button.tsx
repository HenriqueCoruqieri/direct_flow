"use client"

import BlockedActionTrigger from "@/app/_components/blocked-action-trigger"

import NewTicketButton from "./new-ticket-button"

interface NewTicketBlockedButtonProps {
  message: string
}

const NewTicketBlockedButton = ({ message }: NewTicketBlockedButtonProps) => {
  return (
    <BlockedActionTrigger message={message}>
      <NewTicketButton blocked />
    </BlockedActionTrigger>
  )
}

export default NewTicketBlockedButton
