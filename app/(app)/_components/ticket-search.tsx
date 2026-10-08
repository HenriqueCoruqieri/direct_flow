"use client"

import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/app/_components/ui/command"
import { Input } from "@/app/_components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/app/_components/ui/popover"
import { searchTickets } from "@/app/_lib/actions/ticket-search"
import { formatTicketNumber, ticketDetailPath } from "@/app/_lib/domain/ticket"
import {
  TICKET_SEARCH_DEBOUNCE_MS,
  TICKET_SEARCH_EMPTY_MESSAGE,
  TICKET_SEARCH_FAILURE,
  TICKET_SEARCH_LABEL,
  TICKET_SEARCH_LOADING_MESSAGE,
  TICKET_SEARCH_PLACEHOLDER,
  TICKET_SEARCH_RESULTS_LABEL,
} from "@/app/_lib/domain/ticket-search"
import type { TicketSearchResponse } from "@/app/_lib/types/ticket-search"
import { parseTicketSearchQuery } from "@/app/_lib/validation/ticket-search"

import TicketStatusBadge from "./ticket-status-badge"

const POPOVER_COLLISION_PADDING = 20

interface TicketSearchOutcome {
  text: string
  response: TicketSearchResponse
}

const firstResultValue = (response: TicketSearchResponse): string => {
  if (!response.ok) return ""
  const [first] = response.results
  return first ? String(first.id) : ""
}

const TicketSearch = () => {
  const router = useRouter()
  const anchorRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTextRef = useRef<string | null>(null)
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<TicketSearchOutcome | null>(null)
  const [highlighted, setHighlighted] = useState("")

  useEffect(() => {
    const timers = timerRef
    return () => {
      if (timers.current !== null) clearTimeout(timers.current)
    }
  }, [])

  const isValid = parseTicketSearchQuery(text) !== null
  const isOpen = open && isValid
  const response =
    outcome !== null && outcome.text === text ? outcome.response : null

  const cancelScheduledSearch = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const runSearch = async (requestText: string) => {
    const next = await searchTickets(requestText).catch(
      () => TICKET_SEARCH_FAILURE,
    )
    if (pendingTextRef.current !== requestText) return
    setOutcome({ text: requestText, response: next })
    setHighlighted(firstResultValue(next))
  }

  const handleTextChange = (nextText: string) => {
    setText(nextText)
    setOpen(true)
    cancelScheduledSearch()

    if (parseTicketSearchQuery(nextText) === null) {
      pendingTextRef.current = null
      setOutcome(null)
      return
    }

    pendingTextRef.current = nextText
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void runSearch(nextText)
    }, TICKET_SEARCH_DEBOUNCE_MS)
  }

  const openTicket = (ticketId: number) => {
    cancelScheduledSearch()
    pendingTextRef.current = null
    setText("")
    setOutcome(null)
    setHighlighted("")
    setOpen(false)
    router.push(ticketDetailPath(ticketId))
  }

  const keepOpenOnAnchor = (event: Event) => {
    const anchor = anchorRef.current
    if (
      anchor !== null &&
      event.target instanceof Node &&
      anchor.contains(event.target)
    ) {
      event.preventDefault()
    }
  }

  return (
    <Command
      label={TICKET_SEARCH_LABEL}
      shouldFilter={false}
      value={highlighted}
      onValueChange={setHighlighted}
      vimBindings={false}
      loop
      className="contents"
    >
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative flex flex-1 items-center">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-4 size-4.5 text-muted-foreground lg:left-3.5 lg:size-4"
            />
            <CommandPrimitive.Input
              asChild
              value={text}
              onValueChange={handleTextChange}
            >
              <Input
                placeholder={TICKET_SEARCH_PLACEHOLDER}
                aria-expanded={isOpen}
                enterKeyHint="search"
                onFocus={() => setOpen(true)}
                className="h-12 rounded-xl border-border-subtle bg-surface pr-4 pl-11.5 text-foreground lg:h-10 lg:rounded-lg lg:pr-3.5 lg:pl-10 dark:bg-surface"
              />
            </CommandPrimitive.Input>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          collisionPadding={POPOVER_COLLISION_PADDING}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={keepOpenOnAnchor}
          className="w-(--radix-popover-trigger-width) max-w-(--radix-popover-content-available-width) min-w-80 gap-0 p-0"
        >
          <CommandList label={TICKET_SEARCH_RESULTS_LABEL}>
            {response === null ? (
              <p
                role="status"
                className="py-6 text-center text-sm text-muted-foreground"
              >
                {TICKET_SEARCH_LOADING_MESSAGE}
              </p>
            ) : !response.ok ? (
              <p role="status" className="px-4 py-6 text-center text-sm">
                {response.message}
              </p>
            ) : response.results.length === 0 ? (
              <CommandEmpty className="text-muted-foreground">
                <span role="status">{TICKET_SEARCH_EMPTY_MESSAGE}</span>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {response.results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={String(result.id)}
                    onSelect={() => openTicket(result.id)}
                    className="gap-3 py-2 [&>svg]:hidden"
                  >
                    <span className="shrink-0 font-medium text-muted-foreground tabular-nums">
                      {formatTicketNumber(result.id)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {result.title}
                    </span>
                    <span className="shrink-0">
                      <TicketStatusBadge status={result.status} />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  )
}

export default TicketSearch
