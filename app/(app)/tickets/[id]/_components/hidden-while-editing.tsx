"use client"

import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface HiddenWhileEditingProps {
  replacement: React.ReactNode
  children: React.ReactNode
  className?: string
}

const HiddenWhileEditing = ({
  replacement,
  children,
  className,
}: HiddenWhileEditingProps) => {
  const { isEditing } = useTicketEdit()

  return (
    <>
      {isEditing ? replacement : null}
      <div hidden={isEditing} className={className}>
        {children}
      </div>
    </>
  )
}

export default HiddenWhileEditing
