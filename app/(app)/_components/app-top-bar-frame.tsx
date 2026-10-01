import { SearchIcon } from "lucide-react"

import { Input } from "@/app/_components/ui/input"

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
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 size-4.5 text-muted-foreground lg:left-3.5 lg:size-4"
        />
        <label htmlFor="app-search" className="sr-only">
          Buscar chamados
        </label>
        <Input
          id="app-search"
          type="search"
          placeholder="Buscar por #, título ou tag"
          className="h-12 rounded-xl border-border-subtle bg-surface pr-4 pl-11.5 text-foreground lg:h-10 lg:rounded-lg lg:pr-3.5 lg:pl-10 dark:bg-surface"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center">{action}</div>
    </div>
  )
}

export default AppTopBarFrame
