"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, TargetIcon } from "lucide-react"
import { useState } from "react"
import { type DefaultValues, useForm } from "react-hook-form"
import { toast } from "sonner"

import FormSchemaProvider from "@/app/_components/form-schema-provider"
import NumberUnitField from "@/app/_components/number-unit-field"
import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import { FieldLegend, FieldSet } from "@/app/_components/ui/field"
import { saveDepartmentGoals } from "@/app/_lib/actions/department-goals"
import {
  DEFINE_DEPARTMENT_GOALS_LABEL,
  DEPARTMENT_GOALS_FIELD_COPY,
  departmentGoalsDialogDescription,
  EDIT_DEPARTMENT_GOALS_LABEL,
  PERSON_AND_TEAM_GOAL_FIELDS,
  PERSON_AND_TEAM_GOALS_GROUP_LABEL,
  SAVE_DEPARTMENT_GOALS_LABEL,
  SAVE_DEPARTMENT_GOALS_PENDING_LABEL,
  TEAM_ONLY_GOAL_FIELDS,
  TEAM_ONLY_GOALS_GROUP_LABEL,
} from "@/app/_lib/domain/department-goals"
import type { DepartmentGoals } from "@/app/_lib/types/operations"
import {
  type DepartmentGoalsInput,
  departmentGoalsSchema,
} from "@/app/_lib/validation/department-goals"

const LEGEND_CLASS =
  "mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase"

const valuesFor = (
  goals: DepartmentGoals | null,
): DefaultValues<DepartmentGoalsInput> => ({
  slaMinPercent: goals?.slaMinPercent,
  tmaMaxHours: goals?.tmaMaxHours,
  overdueHoursLimit: goals?.overdueHoursLimit,
  overdueTicketsLimit: goals?.overdueTicketsLimit,
  tmrMaxHours: goals?.tmrMaxHours ?? undefined,
})

interface DepartmentGoalsDialogProps {
  departmentId: number
  departmentName: string
  goals: DepartmentGoals | null
  lastChange: string | null
}

const DepartmentGoalsDialog = ({
  departmentId,
  departmentName,
  goals,
  lastChange,
}: DepartmentGoalsDialogProps) => {
  const [open, setOpen] = useState(false)

  const form = useForm<DepartmentGoalsInput>({
    resolver: zodResolver(departmentGoalsSchema),
    defaultValues: valuesFor(goals),
  })

  const isSubmitting = form.formState.isSubmitting
  const title =
    goals === null ? DEFINE_DEPARTMENT_GOALS_LABEL : EDIT_DEPARTMENT_GOALS_LABEL

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(valuesFor(goals))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: DepartmentGoalsInput) => {
    const result = await saveDepartmentGoals({ ...values, departmentId })

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    toast.error(result.message)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {goals === null ? (
          <Button type="button">
            <TargetIcon aria-hidden="true" className="size-4" />
            {DEFINE_DEPARTMENT_GOALS_LABEL}
          </Button>
        ) : (
          <Button type="button" variant="outline">
            <PencilIcon aria-hidden="true" className="size-4" />
            {EDIT_DEPARTMENT_GOALS_LABEL}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <FormSchemaProvider form={form} schema={departmentGoalsSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="shrink-0 border-b border-border-subtle px-6 pt-6 pb-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {departmentGoalsDialogDescription(departmentName)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 scroll-py-6 flex-col gap-6 overflow-y-auto px-6 py-5">
              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>
                  {PERSON_AND_TEAM_GOALS_GROUP_LABEL}
                </FieldLegend>
                <div className="flex flex-col gap-4">
                  {PERSON_AND_TEAM_GOAL_FIELDS.map((name) => (
                    <NumberUnitField
                      key={name}
                      control={form.control}
                      name={name}
                      {...DEPARTMENT_GOALS_FIELD_COPY[name]}
                    />
                  ))}
                </div>
              </FieldSet>

              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>
                  {TEAM_ONLY_GOALS_GROUP_LABEL}
                </FieldLegend>
                <div className="flex flex-col gap-4">
                  {TEAM_ONLY_GOAL_FIELDS.map((name) => (
                    <NumberUnitField
                      key={name}
                      control={form.control}
                      name={name}
                      {...DEPARTMENT_GOALS_FIELD_COPY[name]}
                    />
                  ))}
                </div>
              </FieldSet>
            </div>

            <DialogFooter className="m-0 shrink-0 px-6 py-4">
              {lastChange !== null ? (
                <p className="order-last text-caption text-muted-foreground sm:order-0 sm:mr-auto sm:self-center">
                  {lastChange}
                </p>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting || undefined}
              >
                {isSubmitting ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isSubmitting
                  ? SAVE_DEPARTMENT_GOALS_PENDING_LABEL
                  : SAVE_DEPARTMENT_GOALS_LABEL}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentGoalsDialog
