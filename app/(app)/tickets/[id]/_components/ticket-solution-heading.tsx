export const TICKET_SOLUTION_HEADING_ID = "ticket-solution-heading"

export const TICKET_SOLUTION_TITLE = "Solução"

interface TicketSolutionHeadingProps {
  mark?: React.ReactNode
}

const TicketSolutionHeading = ({ mark }: TicketSolutionHeadingProps) => (
  <h2
    id={TICKET_SOLUTION_HEADING_ID}
    className="flex gap-0.5 font-heading text-base font-semibold"
  >
    {TICKET_SOLUTION_TITLE}
    {mark}
  </h2>
)

export default TicketSolutionHeading
