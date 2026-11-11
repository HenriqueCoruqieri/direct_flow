"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { InfoIcon, Loader2Icon, PencilIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
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
import { Input } from "@/app/_components/ui/input"
import { renameDepartment } from "@/app/_lib/actions/departments"
import {
  canEditDepartmentAdmins,
  departmentAdminIdsOf,
  departmentAdminsNoteFor,
} from "@/app/_lib/domain/department-admins"
import type { DepartmentListItem } from "@/app/_lib/types/department"
import type { DepartmentMember } from "@/app/_lib/types/department-admins"
import {
  type RenameDepartmentInput,
  renameDepartmentSchema,
} from "@/app/_lib/validation/department"

import DepartmentAdminsField from "./department-admins-field"

type EditableDepartment = Pick<
  DepartmentListItem,
  "id" | "name" | "isActive" | "isBoard" | "isUnassigned"
>

interface DepartmentEditDialogProps {
  department: EditableDepartment
  members: DepartmentMember[]
}

const valuesFor = (
  department: EditableDepartment,
  members: DepartmentMember[],
): RenameDepartmentInput => ({
  id: department.id,
  name: department.name,
  admins: canEditDepartmentAdmins(department)
    ? {
        memberIds: members.map(({ id }) => id),
        adminIds: departmentAdminIdsOf(members),
      }
    : undefined,
})

const DepartmentEditDialog = ({
  department,
  members,
}: DepartmentEditDialogProps) => {
  const [open, setOpen] = useState(false)

  const form = useForm<RenameDepartmentInput>({
    resolver: zodResolver(renameDepartmentSchema),
    defaultValues: valuesFor(department, members),
  })

  const isSubmitting = form.formState.isSubmitting
  const canEditAdmins = canEditDepartmentAdmins(department)
  const adminsNote = canEditAdmins ? null : departmentAdminsNoteFor(department)

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(valuesFor(department, members))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: RenameDepartmentInput) => {
    const result = await renameDepartment(values)

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    if (result.code === "NAME_TAKEN" || result.code === "INVALID_INPUT") {
      form.setError("name", { message: result.message }, { shouldFocus: true })
      return
    }

    toast.error(result.message)
    if (result.code === "MEMBERS_CHANGED") setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Editar ${department.name}`}
        >
          <PencilIcon aria-hidden="true" className="size-3.5" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <FormSchemaProvider form={form} schema={renameDepartmentSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="shrink-0 border-b border-border-subtle px-6 pt-6 pb-4">
              <DialogTitle>Editar setor</DialogTitle>
              <DialogDescription>
                O nome aparece para todas as pessoas do setor.
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 scroll-py-6 flex-col gap-6 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                label="Nome do setor"
                description="Nomes iguais não são aceitos, mesmo com outra caixa ou de setor inativo."
              >
                {(field) => <Input {...field} autoComplete="off" />}
              </FormField>

              {canEditAdmins ? (
                <DepartmentAdminsField
                  control={form.control}
                  members={members}
                />
              ) : adminsNote ? (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <InfoIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {adminsNote}
                </p>
              ) : null}
            </div>

            <DialogFooter className="m-0 shrink-0 px-6 py-4">
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
                {isSubmitting ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentEditDialog
