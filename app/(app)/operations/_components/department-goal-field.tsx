"use client"

import type { Control } from "react-hook-form"

import FormField from "@/app/_components/form-field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/app/_components/ui/input-group"
import { DEPARTMENT_GOALS_FIELD_COPY } from "@/app/_lib/domain/department-goals"
import type { DepartmentGoals } from "@/app/_lib/types/operations"
import type { DepartmentGoalsInput } from "@/app/_lib/validation/department-goals"

const inputValueOf = (value: number | undefined): number | "" =>
  typeof value === "number" && Number.isFinite(value) ? value : ""

interface DepartmentGoalFieldProps {
  control: Control<DepartmentGoalsInput>
  name: keyof DepartmentGoals
}

const DepartmentGoalField = ({ control, name }: DepartmentGoalFieldProps) => {
  const copy = DEPARTMENT_GOALS_FIELD_COPY[name]

  return (
    <FormField
      control={control}
      name={name}
      label={copy.label}
      description={copy.description}
    >
      {({ value, onChange, ...field }) => (
        <InputGroup>
          <InputGroupInput
            {...field}
            type="number"
            inputMode="numeric"
            step={1}
            autoComplete="off"
            value={inputValueOf(value)}
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? undefined
                  : event.target.valueAsNumber,
              )
            }
            className="tabular-nums"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{copy.unit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      )}
    </FormField>
  )
}

export default DepartmentGoalField
