import { PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import { Input } from "@/app/_components/ui/input"

const AppTopBar = () => {
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

      <Button
        type="button"
        className="ml-auto size-12 gap-2 rounded-xl px-0 text-sm font-extrabold hover:bg-primary-hover lg:h-10 lg:w-auto lg:rounded-lg lg:px-4"
      >
        <PlusIcon aria-hidden="true" strokeWidth={2.4} className="size-4" />
        <span className="sr-only lg:not-sr-only">Novo chamado</span>
      </Button>
    </div>
  )
}

export default AppTopBar
