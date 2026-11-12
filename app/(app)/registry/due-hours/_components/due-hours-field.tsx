"use client"

import type { Control } from "react-hook-form"

import FormField from "@/app/_components/form-field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/app/_components/ui/input-group"
import { DUE_HOURS_FIELD_COPY } from "@/app/_lib/domain/department-due-hours"
import type { DueHoursField as DueHoursFieldName } from "@/app/_lib/types/department-due-hours"
import type { DepartmentDueHoursInput } from "@/app/_lib/validation/department-due-hours"

const inputValueOf = (value: number | undefined): number | "" =>
  typeof value === "number" && Number.isFinite(value) ? value : ""

interface DueHoursFieldProps {
  control: Control<DepartmentDueHoursInput>
  name: DueHoursFieldName
}

const DueHoursField = ({ control, name }: DueHoursFieldProps) => {
  const copy = DUE_HOURS_FIELD_COPY[name]

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

export default DueHoursField
