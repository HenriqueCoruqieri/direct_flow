"use client"

import { ChevronsUpDownIcon } from "lucide-react"
import { type Ref, useState } from "react"

import { Button } from "@/app/_components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/_components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover"

interface ComboboxOption<TValue extends string | number> {
  value: TValue
  label: string
}

interface ComboboxProps<TValue extends string | number> {
  options: ComboboxOption<TValue>[]
  value: TValue | null | undefined
  onChange: (value: TValue) => void
  onBlur?: () => void
  placeholder: string
  searchPlaceholder: string
  emptyText?: string
  disabled?: boolean
  id?: string
  ref?: Ref<HTMLButtonElement>
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

const COMBINING_MARKS = /[\u0300-\u036f]/g

const normalizeForSearch = (text: string) =>
  text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim()

const matchesSearch = (
  _value: string,
  search: string,
  keywords: string[] = [],
) => {
  const term = normalizeForSearch(search)
  if (term === "") return 1
  return keywords.some((keyword) => normalizeForSearch(keyword).includes(term))
    ? 1
    : 0
}

const Combobox = <TValue extends string | number>({
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  searchPlaceholder,
  emptyText = "Nenhum resultado.",
  disabled,
  id,
  ref,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ComboboxProps<TValue>) => {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? null

  const select = (option: ComboboxOption<TValue>) => {
    onChange(option.value)
    setOpen(false)
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          onBlur={onBlur}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          data-placeholder={selected === null || undefined}
          className="w-full justify-between border-input bg-transparent pr-2 pl-2.5 font-normal data-placeholder:text-muted-foreground"
        >
          <span className="truncate">
            {selected !== null ? selected.label : placeholder}
          </span>
          <ChevronsUpDownIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-0 p-0"
      >
        <Command
          label={searchPlaceholder}
          filter={matchesSearch}
          defaultValue={selected !== null ? String(selected.value) : undefined}
          loop
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={String(option.value)}
                  keywords={[option.label]}
                  data-checked={option.value === value}
                  onSelect={() => select(option)}
                >
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Combobox
