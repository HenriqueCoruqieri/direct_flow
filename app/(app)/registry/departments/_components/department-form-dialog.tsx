"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
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
import {
  createDepartment,
  renameDepartment,
} from "@/app/_lib/actions/departments"
import type { DepartmentListItem } from "@/app/_lib/types/department"
import {
  type CreateDepartmentInput,
  createDepartmentSchema,
} from "@/app/_lib/validation/department"

interface CreateDepartmentFormDialogProps {
  mode: "create"
}

interface RenameDepartmentFormDialogProps {
  mode: "rename"
  department: Pick<DepartmentListItem, "id" | "name">
}

type DepartmentFormDialogProps =
  CreateDepartmentFormDialogProps | RenameDepartmentFormDialogProps

const DepartmentFormDialog = (props: DepartmentFormDialogProps) => {
  const [open, setOpen] = useState(false)
  const initialName = props.mode === "rename" ? props.department.name : ""

  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: initialName },
  })

  const isSubmitting = form.formState.isSubmitting

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset({ name: initialName })
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreateDepartmentInput) => {
    const result =
      props.mode === "rename"
        ? await renameDepartment({ id: props.department.id, name: values.name })
        : await createDepartment(values)

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
  }

  const isRename = props.mode === "rename"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {props.mode === "rename" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Renomear ${props.department.name}`}
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            Renomear
          </Button>
        ) : (
          <Button type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Novo setor
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="gap-6 p-6">
        <FormSchemaProvider form={form} schema={createDepartmentSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>
                {isRename ? "Renomear setor" : "Novo setor"}
              </DialogTitle>
              <DialogDescription>
                {isRename
                  ? "O novo nome aparece para todas as pessoas do setor."
                  : "O setor é criado ativo e pode receber pessoas e chamados."}
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="name"
              label="Nome do setor"
              description="Nomes iguais não são aceitos, mesmo com outra caixa ou de setor inativo."
            >
              {(field) => <Input {...field} autoComplete="off" />}
            </FormField>

            <DialogFooter className="-mx-6 -mb-6 p-4">
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
                  ? "Salvando…"
                  : isRename
                    ? "Salvar nome"
                    : "Criar setor"}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentFormDialog
