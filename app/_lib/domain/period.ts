import type { Period, PresetPeriod } from "@/app/_lib/types/period"

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

export const DEFAULT_PERIOD: PresetPeriod = "hoje"

export const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  personalizado: "Personalizado",
}
