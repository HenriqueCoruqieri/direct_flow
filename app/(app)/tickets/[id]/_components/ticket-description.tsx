interface TicketDescriptionProps {
  description: string
}

const TicketDescription = ({ description }: TicketDescriptionProps) => {
  return (
    <section
      aria-labelledby="ticket-description-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <h2
        id="ticket-description-heading"
        className="font-heading text-base font-semibold"
      >
        Descrição
      </h2>
      <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-text-secondary">
        {description}
      </p>
    </section>
  )
}

export default TicketDescription
