"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { type DefaultValues, useForm } from "react-hook-form"
import { toast } from "sonner"

import Combobox from "@/app/_components/combobox"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { createTag, updateTag } from "@/app/_lib/actions/tags"
import {
  TAG_PRIORITY_FIELD_HINT,
  TAG_PRIORITY_SELECT_OPTIONS,
  tagPriorityFromSelectValue,
  tagPriorityToSelectValue,
} from "@/app/_lib/domain/tag-priority"
import { TICKET_PRIORITY_FIELD_LABEL } from "@/app/_lib/domain/ticket"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { TagListItem } from "@/app/_lib/types/tag"
import {
  type CreateTagFormValues,
  type CreateTagInput,
  createTagSchema,
} from "@/app/_lib/validation/tag"

interface CreateTagWithDepartmentChoiceProps {
  mode: "create"
  departments: DepartmentOption[]
}

interface CreateTagInFixedDepartmentProps {
  mode: "create"
  departmentId: number
}

interface EditTagFormDialogProps {
  mode: "edit"
  tag: Pick<TagListItem, "id" | "name" | "departmentId" | "priority">
}

type TagFormDialogProps =
  | CreateTagWithDepartmentChoiceProps
  | CreateTagInFixedDepartmentProps
  | EditTagFormDialogProps

const initialValuesFor = (
  props: TagFormDialogProps,
): DefaultValues<CreateTagFormValues> => {
  if (props.mode === "edit") {
    return {
      departmentId: props.tag.departmentId,
      name: props.tag.name,
      priority: props.tag.priority,
    }
  }
  if ("departmentId" in props) {
    return { departmentId: props.departmentId, name: "", priority: null }
  }
  return { name: "", priority: null }
}

const TagFormDialog = (props: TagFormDialogProps) => {
  const [open, setOpen] = useState(false)

  const form = useForm<CreateTagFormValues, unknown, CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: initialValuesFor(props),
  })

  const isSubmitting = form.formState.isSubmitting
  const isEdit = props.mode === "edit"
  const departmentChoices =
    props.mode === "create" && "departments" in props ? props.departments : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(initialValuesFor(props))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreateTagInput) => {
    const result =
      props.mode === "edit"
        ? await updateTag({
            id: props.tag.id,
            name: values.name,
            priority: values.priority,
          })
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {props.mode === "edit" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Editar ${props.tag.name}`}
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Nova tag
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="gap-6 p-6">
        <FormSchemaProvider form={form} schema={createTagSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>{isEdit ? "Editar tag" : "Nova tag"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "O novo nome aparece em todos os chamados que usam a tag. A prioridade vale só para chamados abertos daqui em diante."
                  : "A tag é criada ativa e passa a ser oferecida nos chamados do setor."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {departmentChoices ? (
                <FormField
                  control={form.control}
                  name="departmentId"
                  label="Setor"
                >
                  {(field) => (
                    <Combobox
                      ref={field.ref}
                      id={field.id}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                      aria-invalid={field["aria-invalid"]}
                      aria-describedby={field["aria-describedby"]}
                      aria-required={field["aria-required"]}
                      aria-labelledby={field["aria-labelledby"]}
                      options={departmentChoices.map((option) => ({
                        value: option.id,
                        label: option.name,
                      }))}
                      placeholder="Selecione o setor"
                      searchPlaceholder="Buscar setor…"
                    />
                  )}
                </FormField>
              ) : null}

              <FormField
                control={form.control}
                name="name"
                label="Nome da tag"
                description="Nomes iguais no mesmo setor não são aceitos, mesmo com outra caixa ou de tag inativa."
              >
                {(field) => <Input {...field} autoComplete="off" />}
              </FormField>

              <FormField
                control={form.control}
                name="priority"
                label={TICKET_PRIORITY_FIELD_LABEL}
                description={TAG_PRIORITY_FIELD_HINT}
              >
                {({ name, value, onChange, disabled, ...trigger }) => (
                  <Select
                    name={name}
                    value={tagPriorityToSelectValue(value ?? null)}
                    onValueChange={(next) =>
                      onChange(tagPriorityFromSelectValue(next))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger {...trigger} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_PRIORITY_SELECT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
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
                  : isEdit
                    ? "Salvar alterações"
                    : "Criar tag"}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default TagFormDialog
