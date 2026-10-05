"use client"

import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface HiddenWhileEditingProps {
  replacement: React.ReactNode
  children: React.ReactNode
}

const HiddenWhileEditing = ({
  replacement,
  children,
}: HiddenWhileEditingProps) => {
  const { isEditing } = useTicketEdit()

  return (
    <>
      {isEditing ? replacement : null}
      <div hidden={isEditing}>{children}</div>
    </>
  )
}

export default HiddenWhileEditing
