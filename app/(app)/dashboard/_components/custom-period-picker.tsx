"use client"

import { CalendarRangeIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { DateRange as CalendarRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"

import { Button } from "@/app/_components/ui/button"
import { Calendar } from "@/app/_components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover"
import { calendarDateToKey, dateKeyToCalendarDate } from "@/app/_lib/date"
import { PERIOD_LABELS } from "@/app/_lib/domain/period"
import type { PeriodSelection } from "@/app/_lib/types/period"
import { serializeDashboardParams } from "@/app/_lib/validation/dashboard"

import { periodPillVariants } from "./period-pill-variants"

interface CustomPeriodPickerProps {
  selection: PeriodSelection
}

const rangeFromSelection = (
  selection: PeriodSelection,
): CalendarRange | undefined =>
  selection.periodo === "personalizado"
    ? {
        from: dateKeyToCalendarDate(selection.de),
        to: dateKeyToCalendarDate(selection.ate),
      }
    : undefined

const CustomPeriodPicker = ({ selection }: CustomPeriodPickerProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<CalendarRange | undefined>(() =>
    rangeFromSelection(selection),
  )

  const active = selection.periodo === "personalizado"

  const handleOpenChange = (next: boolean) => {
    if (next) setRange(rangeFromSelection(selection))
    setOpen(next)
  }

  const apply = () => {
    if (!range?.from) return
    const de = calendarDateToKey(range.from)
    const ate = calendarDateToKey(range.to ?? range.from)
    setOpen(false)
    router.push(
      `/dashboard?${serializeDashboardParams({ periodo: "personalizado", de, ate })}`,
      { scroll: false },
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          className={periodPillVariants({ active })}
        >
          <CalendarRangeIcon aria-hidden="true" className="size-3.5" />
          {PERIOD_LABELS.personalizado}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          locale={ptBR}
          selected={range}
          onSelect={setRange}
          defaultMonth={range?.from}
          className="p-3"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border-subtle p-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!range?.from}
            className="font-bold hover:bg-primary-hover"
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default CustomPeriodPicker
