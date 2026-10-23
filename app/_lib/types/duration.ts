export type DurationUnit = "d" | "h" | "min"

export interface DurationPart {
  value: string
  unit: DurationUnit
}
