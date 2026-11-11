"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PlusIcon } from "lucide-react"
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
import { createDepartment } from "@/app/_lib/actions/departments"
import {
  type CreateDepartmentInput,
  createDepartmentSchema,
} from "@/app/_lib/validation/department"

const EMPTY_VALUES: CreateDepartmentInput = { name: "" }

const DepartmentFormDialog = () => {
  const [open, setOpen] = useState(false)

  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: EMPTY_VALUES,
  })

  const isSubmitting = form.formState.isSubmitting

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(EMPTY_VALUES)
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreateDepartmentInput) => {
    const result = await createDepartment(values)

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <PlusIcon aria-hidden="true" className="size-4" />
          Novo setor
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-6 p-6">
        <FormSchemaProvider form={form} schema={createDepartmentSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>Novo setor</DialogTitle>
              <DialogDescription>
                O setor é criado ativo e pode receber pessoas e chamados.
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
                {isSubmitting ? "Salvando…" : "Criar setor"}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentFormDialog
