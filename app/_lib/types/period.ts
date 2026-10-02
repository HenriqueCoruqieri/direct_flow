export type Period = "hoje" | "semana" | "mes" | "personalizado"

export type PresetPeriod = Exclude<Period, "personalizado">

export type AllTimePeriod = "todos"

export type PeriodOption = Period | AllTimePeriod

export type PresetPeriodOption = Exclude<PeriodOption, "personalizado">

export type DateKey = string

export interface PresetPeriodSelection {
  periodo: PresetPeriod
}

export interface CustomPeriodSelection {
  periodo: "personalizado"
  de: DateKey
  ate: DateKey
}

export type PeriodSelection = PresetPeriodSelection | CustomPeriodSelection

export interface AllTimeSelection {
  periodo: AllTimePeriod
}

export type PeriodFilterSelection = PeriodSelection | AllTimeSelection

export interface DateRange {
  start: Date
  end: Date
}
