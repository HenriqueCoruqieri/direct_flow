"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { type DefaultValues, useForm, useWatch } from "react-hook-form"
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
import { createPerson, updatePerson } from "@/app/_lib/actions/people"
import { forcedRoleFor } from "@/app/_lib/domain/person"
import { ROLE_LABELS, ROLES } from "@/app/_lib/domain/user"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { PersonListItem } from "@/app/_lib/types/person"
import {
  type CreatePersonInput,
  createPersonSchema,
} from "@/app/_lib/validation/person"

import departmentOptionLabel from "../../_components/department-option-label"

interface CreatePersonWithDepartmentChoiceProps {
  mode: "create"
  departments: DepartmentOption[]
  canAssignRole: boolean
}

interface CreatePersonInFixedDepartmentProps {
  mode: "create"
  departmentId: number
}

interface EditPersonFormDialogProps {
  mode: "edit"
  person: Pick<
    PersonListItem,
    "id" | "name" | "email" | "role" | "departmentId" | "departmentIsBoard"
  >
  departments: DepartmentOption[]
  canAssignRole: boolean
}

type PersonFormDialogProps =
  | CreatePersonWithDepartmentChoiceProps
  | CreatePersonInFixedDepartmentProps
  | EditPersonFormDialogProps

const roleFromValue = (value: string) => ROLES.find((role) => role === value)

const departmentChoicesOf = (
  props: PersonFormDialogProps,
): DepartmentOption[] | null =>
  "departments" in props ? props.departments : null

const showsRoleField = (props: PersonFormDialogProps): boolean =>
  "canAssignRole" in props && props.canAssignRole

const initialValuesFor = (
  props: PersonFormDialogProps,
): DefaultValues<CreatePersonInput> => {
  if (props.mode === "edit") {
    return {
      name: props.person.name,
      email: props.person.email,
      departmentId: props.person.departmentId,
      role: props.canAssignRole ? props.person.role : undefined,
    }
  }
  if ("departmentId" in props) {
    return { name: "", email: "", departmentId: props.departmentId }
  }
  return {
    name: "",
    email: "",
    role: props.canAssignRole ? "member" : undefined,
  }
}

const PersonFormDialog = (props: PersonFormDialogProps) => {
  const [open, setOpen] = useState(false)

  const form = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: initialValuesFor(props),
  })

  const isSubmitting = form.formState.isSubmitting
  const isEdit = props.mode === "edit"
  const departmentChoices = departmentChoicesOf(props)
  const showRole = showsRoleField(props)

  const selectedDepartmentId = useWatch({
    control: form.control,
    name: "departmentId",
  })
  const selectedDepartment =
    departmentChoices?.find((option) => option.id === selectedDepartmentId) ??
    null
  const forcedRole = selectedDepartment
    ? forcedRoleFor(selectedDepartment)
    : null
  const isLeavingBoard =
    props.mode === "edit" &&
    props.person.departmentIsBoard &&
    selectedDepartment !== null &&
    !selectedDepartment.isBoard

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(initialValuesFor(props))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreatePersonInput) => {
    const input = {
      name: values.name,
      email: values.email,
      departmentId: values.departmentId,
      role: showRole ? (forcedRole ?? values.role) : undefined,
    }
    const result =
      props.mode === "edit"
        ? await updatePerson({ id: props.person.id, ...input })
        : await createPerson(input)

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    if (result.code === "EMAIL_TAKEN") {
      form.setError("email", { message: result.message }, { shouldFocus: true })
      return
    }

    toast.error(result.message)
  }

  const roleHint =
    forcedRole !== null
      ? `Na Diretoria o papel é sempre ${ROLE_LABELS[forcedRole]}.`
      : isLeavingBoard
        ? "Fora da Diretoria o papel deixa de ser fixo. Escolha o papel que a pessoa terá no novo setor."
        : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {props.mode === "edit" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Editar ${props.person.name}`}
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Nova pessoa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="gap-6 p-6">
        <FormSchemaProvider form={form} schema={createPersonSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>
                {isEdit ? "Editar pessoa" : "Nova pessoa"}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Atualize os dados de cadastro da pessoa."
                  : "A pessoa entra com a senha padrão e define a própria senha no primeiro acesso."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <FormField control={form.control} name="name" label="Nome">
                {(field) => <Input {...field} autoComplete="off" />}
              </FormField>

              <FormField control={form.control} name="email" label="E-mail">
                {(field) => (
                  <Input
                    {...field}
                    type="email"
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              </FormField>

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
                        label: departmentOptionLabel(option),
                      }))}
                      placeholder="Selecione o setor"
                      searchPlaceholder="Buscar setor…"
                    />
                  )}
                </FormField>
              ) : null}

              {showRole ? (
                <FormField
                  control={form.control}
                  name="role"
                  label="Papel"
                  description={roleHint}
                >
                  {({ name, value, onChange, disabled, ...trigger }) => (
                    <Select
                      name={name}
                      value={forcedRole ?? value ?? ""}
                      onValueChange={(next) => onChange(roleFromValue(next))}
                      disabled={disabled || forcedRole !== null}
                    >
                      <SelectTrigger {...trigger} className="w-full">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              ) : null}
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
                    : "Cadastrar pessoa"}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default PersonFormDialog
