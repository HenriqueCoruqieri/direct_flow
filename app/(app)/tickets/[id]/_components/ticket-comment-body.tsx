interface TicketCommentBodyProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

const TicketCommentBody = ({ children, actions }: TicketCommentBodyProps) => {
  const hasActions = actions !== undefined && actions !== null

  return (
    <div className="flex flex-col gap-1">
      {children}
      {hasActions ? (
        <div className="flex justify-end gap-1">{actions}</div>
      ) : null}
    </div>
  )
}

export default TicketCommentBody
