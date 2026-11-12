"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { InfoIcon, Loader2Icon } from "lucide-react"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormSchemaProvider from "@/app/_components/form-schema-provider"
import NumberUnitField from "@/app/_components/number-unit-field"
import { Button } from "@/app/_components/ui/button"
import { saveDepartmentDueHours } from "@/app/_lib/actions/department-due-hours"
import {
  DUE_HOURS_APPLIES_FROM_NOW_HINT,
  DUE_HOURS_FIELD_COPY,
  DUE_HOURS_FIELDS,
  SAVE_DUE_HOURS_LABEL,
  SAVE_DUE_HOURS_PENDING_LABEL,
} from "@/app/_lib/domain/department-due-hours"
import type { DepartmentDueHours } from "@/app/_lib/types/department-due-hours"
import {
  type DepartmentDueHoursInput,
  departmentDueHoursSchema,
} from "@/app/_lib/validation/department-due-hours"

interface DueHoursFormProps {
  departmentId: number
  departmentName: string
  hours: DepartmentDueHours
  canEdit: boolean
  status: React.ReactNode
}

const DueHoursForm = ({
  departmentId,
  departmentName,
  hours,
  canEdit,
  status,
}: DueHoursFormProps) => {
  const headingId = useId()
  const hintId = useId()

  const form = useForm<DepartmentDueHoursInput>({
    resolver: zodResolver(departmentDueHoursSchema),
    defaultValues: hours,
  })

  const isSubmitting = form.formState.isSubmitting

  const onSubmit = async (values: DepartmentDueHoursInput) => {
    const result = await saveDepartmentDueHours({ ...values, departmentId })

    if (result.ok) {
      toast.success(result.message)
      return
    }

    toast.error(result.message)
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex max-w-3xl flex-col rounded-2xl border border-border-subtle bg-surface"
    >
      <FormSchemaProvider form={form} schema={departmentDueHoursSchema}>
        <form
          noValidate
          aria-describedby={hintId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col"
        >
          <div className="flex flex-col gap-3 border-b border-border-subtle px-6 pt-5 pb-4">
            <h2 id={headingId} className="font-heading text-base font-semibold">
              {departmentName}
            </h2>
            {status}
          </div>

          <fieldset
            disabled={!canEdit || isSubmitting}
            className="grid gap-5 px-6 py-5 sm:grid-cols-2"
          >
            {DUE_HOURS_FIELDS.map((name) => (
              <NumberUnitField
                key={name}
                control={form.control}
                name={name}
                {...DUE_HOURS_FIELD_COPY[name]}
              />
            ))}
          </fieldset>

          <div className="flex flex-col gap-4 border-t border-border-subtle px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              id={hintId}
              className="flex items-start gap-2 text-caption text-muted-foreground"
            >
              <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {DUE_HOURS_APPLIES_FROM_NOW_HINT}
            </p>
            {canEdit ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting || undefined}
                className="shrink-0"
              >
                {isSubmitting ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isSubmitting
                  ? SAVE_DUE_HOURS_PENDING_LABEL
                  : SAVE_DUE_HOURS_LABEL}
              </Button>
            ) : null}
          </div>
        </form>
      </FormSchemaProvider>
    </section>
  )
}

export default DueHoursForm
