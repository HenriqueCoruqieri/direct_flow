"use client"

import type { Control, FieldPath, FieldValues } from "react-hook-form"

import FormField from "@/app/_components/form-field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/app/_components/ui/input-group"

const inputValueOf = (value: unknown): number | "" =>
  typeof value === "number" && Number.isFinite(value) ? value : ""

interface NumberUnitFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues,
> {
  control: Control<TFieldValues, unknown, TTransformedValues>
  name: TName
  label: string
  description: string
  unit: string
}

const NumberUnitField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({
  control,
  name,
  label,
  description,
  unit,
}: NumberUnitFieldProps<TFieldValues, TName, TTransformedValues>) => {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
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
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      )}
    </FormField>
  )
}

export default NumberUnitField
