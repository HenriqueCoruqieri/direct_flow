import "dayjs/locale/pt-br"

import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

import type {
  DateKey,
  DateRange,
  PeriodSelection,
} from "@/app/_lib/types/period"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale("pt-br")

export const APP_TIME_ZONE = "America/Sao_Paulo"

export type DateInput = Date | string | number

const DATE_KEY_FORMAT = "YYYY-MM-DD"
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const inAppZone = (value: DateInput) => dayjs(value).tz(APP_TIME_ZONE)

const pad = (value: number): string => String(value).padStart(2, "0")

export const formatDate = (value: DateInput): string =>
  inAppZone(value).format("DD/MM/YYYY")

export const formatDateTime = (value: DateInput): string =>
  inAppZone(value).format("DD/MM/YYYY HH:mm")

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

const weekStartKey = (key: DateKey): DateKey =>
  addDaysToKey(key, -((dayjs.utc(key).day() + 6) % 7))

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
