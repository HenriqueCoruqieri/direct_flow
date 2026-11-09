"use client"

import { Command as CommandPrimitive } from "cmdk"
import { ChevronDownIcon } from "lucide-react"
import { type Ref, useEffect, useRef, useState } from "react"

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

interface AutocompleteProps<TOption, TValue extends string | number> {
  id: string
  options: readonly TOption[]
  value: TValue | null | undefined
  onChange: (value: TValue | undefined) => void
  onBlur?: () => void
  getOptionValue: (option: TOption) => TValue
  getOptionLabel: (option: TOption) => string
  filterOption: (option: TOption, query: string) => boolean
  listLabel: string
  placeholder: string
  emptyText: string
  disabled?: boolean
  ref?: Ref<HTMLInputElement>
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

const OPENING_KEYS = new Set(["ArrowDown", "ArrowUp"])

const CMDK_FOCUS_HANDOFF_OFF = { "cmdk-input": undefined }

const CLOSED_LIST_ARIA = {
  "aria-controls": undefined,
  "aria-activedescendant": undefined,
}

const stopPropagation = (event: Event) => event.stopPropagation()

const keepScrollInside = (node: HTMLDivElement | null) => {
  if (node === null) return
  node.addEventListener("wheel", stopPropagation)
  node.addEventListener("touchmove", stopPropagation)
  return () => {
    node.removeEventListener("wheel", stopPropagation)
    node.removeEventListener("touchmove", stopPropagation)
  }
}

const Autocomplete = <TOption, TValue extends string | number>({
  id,
  options,
  value,
  onChange,
  onBlur,
  getOptionValue,
  getOptionLabel,
  filterOption,
  listLabel,
  placeholder,
  emptyText,
  disabled,
  ref,
  "aria-labelledby": ariaLabelledBy,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: AutocompleteProps<TOption, TValue>) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState("")

  const selected =
    value === null || value === undefined
      ? undefined
      : options.find((option) => getOptionValue(option) === value)
  const text = draft ?? (selected !== undefined ? getOptionLabel(selected) : "")
  const query = draft ?? ""
  const matches = options.filter((option) => filterOption(option, query))
  const isOpen = open && !disabled
  const hasStaleValue =
    value !== null && value !== undefined && selected === undefined

  useEffect(() => {
    if (hasStaleValue) onChange(undefined)
  }, [hasStaleValue, onChange])

  const firstMatchValue = (candidates: readonly TOption[]) => {
    const [first] = candidates
    return first !== undefined ? String(getOptionValue(first)) : ""
  }

  const openList = () => {
    if (isOpen) return
    setHighlighted(
      selected !== undefined && draft === null
        ? String(getOptionValue(selected))
        : firstMatchValue(matches),
    )
    setOpen(true)
  }

  const handleTextChange = (nextText: string) => {
    setDraft(nextText)
    setOpen(true)
    setHighlighted(
      firstMatchValue(
        options.filter((option) => filterOption(option, nextText)),
      ),
    )
    if (value !== null && value !== undefined) onChange(undefined)
  }

  const choose = (option: TOption) => {
    onChange(getOptionValue(option))
    setDraft(null)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && OPENING_KEYS.has(event.key)) openList()
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
      shouldFilter={false}
      value={highlighted}
      onValueChange={setHighlighted}
      vimBindings={false}
      loop
      className="contents"
    >
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative flex items-center">
            <CommandPrimitive.Input
              asChild
              value={text}
              onValueChange={handleTextChange}
            >
              <Input
                ref={ref}
                id={id}
                {...CMDK_FOCUS_HANDOFF_OFF}
                placeholder={placeholder}
                disabled={disabled}
                aria-expanded={isOpen}
                {...(isOpen ? undefined : CLOSED_LIST_ARIA)}
                aria-labelledby={ariaLabelledBy}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                onClick={openList}
                onKeyDown={handleKeyDown}
                onBlur={onBlur}
                className="pr-8"
              />
            </CommandPrimitive.Input>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute right-2 size-4 text-muted-foreground"
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          ref={keepScrollInside}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={keepOpenOnAnchor}
          onMouseDown={(event) => event.preventDefault()}
          className="w-(--radix-popover-trigger-width) gap-0 p-0"
        >
          <CommandList label={listLabel}>
            {matches.length === 0 ? (
              <CommandEmpty
                aria-hidden="true"
                className="text-muted-foreground"
              >
                {emptyText}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {matches.map((option) => {
                  const optionValue = getOptionValue(option)
                  return (
                    <CommandItem
                      key={optionValue}
                      value={String(optionValue)}
                      data-checked={optionValue === value}
                      onSelect={() => choose(option)}
                    >
                      <span className="truncate">{getOptionLabel(option)}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
      <span role="status" className="sr-only">
        {isOpen && matches.length === 0 ? emptyText : ""}
      </span>
    </Command>
  )
}

export default Autocomplete
