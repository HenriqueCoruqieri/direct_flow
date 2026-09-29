"use client"

import { ListFilterIcon } from "lucide-react"
import { useId } from "react"

import { Button } from "@/app/_components/ui/button"
import { Checkbox } from "@/app/_components/ui/checkbox"
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/app/_components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover"

export interface DataTableFilterOption {
  value: string
  label: string
}

export interface DataTableFilter {
  columnId: string
  label: string
  options: ReadonlyArray<DataTableFilterOption>
}

export interface DataTableFilterGroup extends DataTableFilter {
  selected: ReadonlyArray<string>
}

interface DataTableFiltersProps {
  groups: ReadonlyArray<DataTableFilterGroup>
  onSelectedChange: (columnId: string, selected: string[]) => void
  onClear: () => void
}

const toggleValue = (
  selected: ReadonlyArray<string>,
  value: string,
  checked: boolean,
): string[] =>
  checked
    ? [...selected.filter((item) => item !== value), value]
    : selected.filter((item) => item !== value)

const DataTableFilters = ({
  groups,
  onSelectedChange,
  onClear,
}: DataTableFiltersProps) => {
  const idPrefix = useId()
  const selectedCount = groups.reduce(
    (total, group) => total + group.selected.length,
    0,
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 bg-surface px-3 dark:bg-surface"
        >
          <ListFilterIcon aria-hidden="true" className="size-4" />
          <span>Filtros</span>
          {selectedCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              <span className="sr-only">, </span>
              {selectedCount}
              <span className="sr-only">
                {selectedCount === 1 ? " selecionado" : " selecionados"}
              </span>
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--radix-popover-content-available-height) w-72 gap-4 overflow-y-auto p-4"
      >
        {groups.map((group) => (
          <FieldSet key={group.columnId} className="gap-2">
            <FieldLegend variant="label" className="mb-1">
              {group.label}
            </FieldLegend>
            {group.options.map((option) => {
              const id = `${idPrefix}-${group.columnId}-${option.value}`

              return (
                <Field key={option.value} orientation="horizontal">
                  <Checkbox
                    id={id}
                    checked={group.selected.includes(option.value)}
                    onCheckedChange={(checked) =>
                      onSelectedChange(
                        group.columnId,
                        toggleValue(
                          group.selected,
                          option.value,
                          checked === true,
                        ),
                      )
                    }
                  />
                  <FieldLabel htmlFor={id} className="font-normal">
                    {option.label}
                  </FieldLabel>
                </Field>
              )
            })}
          </FieldSet>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          disabled={selectedCount === 0}
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export default DataTableFilters
