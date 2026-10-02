"use client"

import BlockedActionTrigger from "@/app/_components/blocked-action-trigger"

import EditTicketButton from "./edit-ticket-button"

interface EditTicketBlockedButtonProps {
  message: string
}

const EditTicketBlockedButton = ({ message }: EditTicketBlockedButtonProps) => {
  return (
    <BlockedActionTrigger message={message}>
      <EditTicketButton blocked />
    </BlockedActionTrigger>
  )
}

export default EditTicketBlockedButton
