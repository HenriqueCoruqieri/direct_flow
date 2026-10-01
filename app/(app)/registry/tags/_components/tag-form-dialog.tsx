"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, type DefaultValues, useForm } from "react-hook-form"
import { toast } from "sonner"

import Combobox from "@/app/_components/combobox"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"
import { createTag, renameTag } from "@/app/_lib/actions/tags"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { TagListItem } from "@/app/_lib/types/tag"
import { type CreateTagInput, createTagSchema } from "@/app/_lib/validation/tag"

interface CreateTagWithDepartmentChoiceProps {
  mode: "create"
  departments: DepartmentOption[]
}

interface CreateTagInFixedDepartmentProps {
  mode: "create"
  departmentId: number
}

interface RenameTagFormDialogProps {
  mode: "rename"
  tag: Pick<TagListItem, "id" | "name" | "departmentId">
}

type TagFormDialogProps =
  | CreateTagWithDepartmentChoiceProps
  | CreateTagInFixedDepartmentProps
  | RenameTagFormDialogProps

const initialValuesFor = (
  props: TagFormDialogProps,
): DefaultValues<CreateTagInput> => {
  if (props.mode === "rename") {
    return { departmentId: props.tag.departmentId, name: props.tag.name }
  }
  if ("departmentId" in props) {
    return { departmentId: props.departmentId, name: "" }
  }
  return { name: "" }
}

const TagFormDialog = (props: TagFormDialogProps) => {
  const nameId = useId()
  const departmentId = useId()
  const [open, setOpen] = useState(false)

  const form = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: initialValuesFor(props),
  })

  const isSubmitting = form.formState.isSubmitting
  const isRename = props.mode === "rename"
  const departmentChoices =
    props.mode === "create" && "departments" in props ? props.departments : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(initialValuesFor(props))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreateTagInput) => {
    const result =
      props.mode === "rename"
        ? await renameTag({ id: props.tag.id, name: values.name })
        : await createTag(values)

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    if (result.code === "NAME_TAKEN") {
      form.setError("name", { message: result.message }, { shouldFocus: true })
      return
    }

    toast.error(result.message)
  }

  const nameErrorId = `${nameId}-error`
  const nameHintId = `${nameId}-hint`
  const departmentErrorId = `${departmentId}-error`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {props.mode === "rename" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Renomear ${props.tag.name}`}
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            Renomear
          </Button>
        ) : (
          <Button type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Nova tag
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="gap-6 p-6">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>{isRename ? "Renomear tag" : "Nova tag"}</DialogTitle>
            <DialogDescription>
              {isRename
                ? "O novo nome aparece em todos os chamados que usam a tag."
                : "A tag é criada ativa e passa a ser oferecida nos chamados do setor."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {departmentChoices ? (
              <Controller
                name="departmentId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-1.5">
                    <FieldLabel htmlFor={departmentId}>Setor</FieldLabel>
                    <Combobox
                      id={departmentId}
                      ref={field.ref}
                      options={departmentChoices.map((option) => ({
                        value: option.id,
                        label: option.name,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                      placeholder="Selecione o setor"
                      searchPlaceholder="Buscar setor…"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.invalid ? departmentErrorId : undefined
                      }
                    />
                    {fieldState.invalid ? (
                      <FieldError
                        id={departmentErrorId}
                        errors={[fieldState.error]}
                      />
                    ) : null}
                  </Field>
                )}
              />
            ) : null}

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={nameId}>Nome da tag</FieldLabel>
                  <Input
                    {...field}
                    id={nameId}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? nameErrorId : nameHintId
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError id={nameErrorId} errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription id={nameHintId}>
                      Nomes iguais no mesmo setor não são aceitos, mesmo com
                      outra caixa ou de tag inativa.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
          </div>

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
                  : "Criar tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TagFormDialog
