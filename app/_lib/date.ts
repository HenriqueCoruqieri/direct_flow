import "dayjs/locale/pt-br"

import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

import type { DurationPart } from "@/app/_lib/types/duration"
import type {
  DateKey,
  DateRange,
  DayWindow,
  PeriodFilterSelection,
  PeriodSelection,
} from "@/app/_lib/types/period"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale("pt-br")

export const APP_TIME_ZONE = "America/Sao_Paulo"

export const WEEK_STARTS_ON = 1

export type DateInput = Date | string | number

export const MINUTE_MS = 60 * 1000

export const HOUR_MS = 60 * MINUTE_MS

const MINUTES_PER_HOUR = 60

const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

const integerFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
})

const DATE_KEY_FORMAT = "YYYY-MM-DD"
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const inAppZone = (value: DateInput) => dayjs(value).tz(APP_TIME_ZONE)

const pad = (value: number): string => String(value).padStart(2, "0")

const capitalize = (value: string): string =>
  value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1)

export const formatDate = (value: DateInput): string =>
  inAppZone(value).format("DD/MM/YYYY")

export const formatDateTime = (value: DateInput): string =>
  inAppZone(value).format("DD/MM/YYYY HH:mm")

export const formatShortDateTime = (
  value: DateInput,
  now: DateInput = new Date(),
): string => {
  const zoned = inAppZone(value)
  return zoned.isSame(inAppZone(now), "year")
    ? zoned.format("D MMM, HH:mm")
    : zoned.format("D MMM YYYY, HH:mm")
}

export const formatRelative = (
  value: DateInput,
  now: DateInput = new Date(),
): string => dayjs(value).from(dayjs(now))

export const toISO = (value: DateInput): string => dayjs(value).toISOString()

export const parseISO = (value: string): Date | null => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.toDate() : null
}

export const isDateKey = (value: string): value is DateKey =>
  DATE_KEY_PATTERN.test(value) &&
  dayjs.utc(value).isValid() &&
  dayjs.utc(value).format(DATE_KEY_FORMAT) === value

export const toDateKey = (value: DateInput): DateKey =>
  inAppZone(value).format(DATE_KEY_FORMAT)

export const todayKey = (now: DateInput = new Date()): DateKey => toDateKey(now)

export const addDaysToKey = (key: DateKey, amount: number): DateKey =>
  dayjs.utc(key).add(amount, "day").format(DATE_KEY_FORMAT)

export const addMonthsToKey = (key: DateKey, amount: number): DateKey =>
  dayjs.utc(key).add(amount, "month").format(DATE_KEY_FORMAT)

export const zonedDateTime = (key: DateKey, hour = 0, minute = 0): Date =>
  dayjs.tz(`${key}T${pad(hour)}:${pad(minute)}:00`, APP_TIME_ZONE).toDate()

const dayRange = (firstKey: DateKey, lastKey: DateKey): DateRange => ({
  start: zonedDateTime(firstKey),
  end: zonedDateTime(addDaysToKey(lastKey, 1)),
})

export const lastDayWindows = (
  count: number,
  now: DateInput = new Date(),
): DayWindow[] => {
  const today = todayKey(now)
  const total = Math.max(Math.floor(count), 1)
  return Array.from({ length: total }, (_, index) => {
    const key = addDaysToKey(today, index - total + 1)
    return { key, ...dayRange(key, key) }
  })
}

export const formatWeekdayDay = (key: DateKey): string =>
  capitalize(dayjs.utc(key).format("ddd D"))

export const formatWeekdayLong = (key: DateKey): string =>
  dayjs.utc(key).format("dddd, D [de] MMMM")

const weekStartKey = (key: DateKey): DateKey =>
  addDaysToKey(key, -((dayjs.utc(key).day() - WEEK_STARTS_ON + 7) % 7))

const monthStartKey = (key: DateKey): DateKey =>
  dayjs.utc(key).startOf("month").format(DATE_KEY_FORMAT)

export const resolvePeriodRange = (
  selection: PeriodSelection,
  now: DateInput = new Date(),
): DateRange => {
  const today = todayKey(now)

  switch (selection.periodo) {
    case "hoje":
      return dayRange(today, today)
    case "semana": {
      const monday = weekStartKey(today)
      return dayRange(monday, addDaysToKey(monday, 6))
    }
    case "mes": {
      const first = monthStartKey(today)
      return dayRange(first, addDaysToKey(addMonthsToKey(first, 1), -1))
    }
    case "personalizado":
      return dayRange(selection.de, selection.ate)
  }
}

export const resolvePeriodFilterRange = (
  selection: PeriodFilterSelection,
  now: DateInput = new Date(),
): DateRange | null =>
  selection.periodo === "todos" ? null : resolvePeriodRange(selection, now)

export const formatRangeLabel = (range: DateRange): string => {
  const first = dayjs.utc(toDateKey(range.start))
  const last = dayjs.utc(toDateKey(range.end.getTime() - 1))

  if (first.isSame(last, "day")) return first.format("D MMM YYYY")
  if (first.isSame(last, "month")) {
    return `${first.format("D")}–${last.format("D MMM YYYY")}`
  }
  if (first.isSame(last, "year")) {
    return `${first.format("D MMM")} – ${last.format("D MMM YYYY")}`
  }
  return `${first.format("D MMM YYYY")} – ${last.format("D MMM YYYY")}`
}

export const calendarDateToKey = (value: Date): DateKey =>
  dayjs(value).format(DATE_KEY_FORMAT)

export const dateKeyToCalendarDate = (key: DateKey): Date => dayjs(key).toDate()

export const todayCalendarDate = (now: DateInput = new Date()): Date =>
  dateKeyToCalendarDate(todayKey(now))

export const durationParts = (durationMs: number): DurationPart[] => {
  const totalMinutes = Math.floor(Math.max(durationMs, 0) / MINUTE_MS)
  if (totalMinutes < 1) return [{ value: "< 1", unit: "min" }]

  const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR

  if (days > 0) {
    const dayPart: DurationPart = { value: String(days), unit: "d" }
    return hours > 0
      ? [dayPart, { value: String(hours), unit: "h" }]
      : [dayPart]
  }
  if (hours > 0) {
    const hourPart: DurationPart = { value: String(hours), unit: "h" }
    return minutes > 0
      ? [hourPart, { value: String(minutes), unit: "min" }]
      : [hourPart]
  }
  return [{ value: String(minutes), unit: "min" }]
}

export const formatDuration = (durationMs: number): string =>
  durationParts(durationMs)
    .map((part) => `${part.value}${part.unit}`)
    .join(" ")

export const formatTotalHours = (durationMs: number): string =>
  `${integerFormat.format(Math.floor(Math.max(durationMs, 0) / HOUR_MS))}h`

export const elapsedMs = (
  value: DateInput,
  now: DateInput = new Date(),
): number => Math.max(dayjs(now).diff(dayjs(value)), 0)

export const formatElapsed = (
  value: DateInput,
  now: DateInput = new Date(),
): string => {
  const elapsed = elapsedMs(value, now)
  return elapsed < MINUTE_MS ? "agora" : `há ${formatDuration(elapsed)}`
}
