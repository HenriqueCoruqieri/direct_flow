interface TicketCommentBodyProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

const TicketCommentBody = ({ children, actions }: TicketCommentBodyProps) => {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {actions !== undefined && actions !== null ? (
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export default TicketCommentBody
