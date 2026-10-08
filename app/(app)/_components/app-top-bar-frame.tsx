import TicketSearch from "./ticket-search"

interface AppTopBarFrameProps {
  action: React.ReactNode
}

const AppTopBarFrame = ({ action }: AppTopBarFrameProps) => {
  return (
    <div className="flex items-center gap-3 px-5 pb-2 lg:h-17 lg:shrink-0 lg:border-b lg:border-border-subtle lg:px-6 lg:pb-0">
      <div
        role="search"
        className="relative flex max-w-105 flex-1 items-center"
      >
        <TicketSearch />
      </div>

      <div className="ml-auto flex shrink-0 items-center">{action}</div>
    </div>
  )
}

export default AppTopBarFrame
