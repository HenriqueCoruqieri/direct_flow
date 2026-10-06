import type {
  Period,
  PeriodOption,
  PresetPeriod,
  PresetPeriodOption,
} from "@/app/_lib/types/period"

export const PERIODS = [
  "hoje",
  "semana",
  "mes",
  "personalizado",
] as const satisfies readonly Period[]

export const PRESET_PERIODS = [
  "hoje",
  "semana",
  "mes",
] as const satisfies readonly PresetPeriod[]

export const ALL_TIME_PERIOD_PRESETS = [
  "todos",
  ...PRESET_PERIODS,
] as const satisfies readonly PresetPeriodOption[]

export const DEFAULT_PERIOD: PresetPeriod = "hoje"

export const PERIOD_LABELS = {
  todos: "Todos",
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  personalizado: "Personalizado",
} satisfies Record<PeriodOption, string>
