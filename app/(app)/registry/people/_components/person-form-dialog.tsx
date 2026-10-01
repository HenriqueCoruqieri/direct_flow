"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useId, useState } from "react"
import {
  Controller,
  type DefaultValues,
  useForm,
  useWatch,
} from "react-hook-form"
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
  const nameId = useId()
  const emailId = useId()
  const departmentId = useId()
  const roleId = useId()
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

  const nameErrorId = `${nameId}-error`
  const emailErrorId = `${emailId}-error`
  const departmentErrorId = `${departmentId}-error`
  const roleErrorId = `${roleId}-error`
  const roleHintId = `${roleId}-hint`

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
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={nameId}>Nome</FieldLabel>
                  <Input
                    {...field}
                    id={nameId}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? nameErrorId : undefined
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError id={nameErrorId} errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={emailId}>E-mail</FieldLabel>
                  <Input
                    {...field}
                    id={emailId}
                    type="email"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? emailErrorId : undefined
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError id={emailErrorId} errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

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
                        label: departmentOptionLabel(option),
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

            {showRole ? (
              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-1.5">
                    <FieldLabel htmlFor={roleId}>Papel</FieldLabel>
                    <Select
                      name={field.name}
                      value={forcedRole ?? field.value ?? ""}
                      onValueChange={(value) =>
                        field.onChange(roleFromValue(value))
                      }
                      disabled={field.disabled || forcedRole !== null}
                    >
                      <SelectTrigger
                        id={roleId}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid}
                        aria-describedby={
                          fieldState.invalid
                            ? roleErrorId
                            : roleHint !== null
                              ? roleHintId
                              : undefined
                        }
                        className="w-full"
                      >
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
                    {fieldState.invalid ? (
                      <FieldError
                        id={roleErrorId}
                        errors={[fieldState.error]}
                      />
                    ) : roleHint !== null ? (
                      <FieldDescription id={roleHintId}>
                        {roleHint}
                      </FieldDescription>
                    ) : null}
                  </Field>
                )}
              />
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
      </DialogContent>
    </Dialog>
  )
}

export default PersonFormDialog
