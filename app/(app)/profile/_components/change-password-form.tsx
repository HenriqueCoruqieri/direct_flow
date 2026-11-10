"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import { Button } from "@/app/_components/ui/button"
import { FieldGroup } from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"
import { changePassword } from "@/app/_lib/actions/profile"
import {
  type ChangePasswordInput,
  changePasswordSchema,
} from "@/app/_lib/validation/password"

type PasswordFieldName = keyof ChangePasswordInput

interface PasswordFieldConfig {
  name: PasswordFieldName
  id: string
  label: string
  autoComplete: "current-password" | "new-password"
}

const PASSWORD_FIELDS: PasswordFieldConfig[] = [
  {
    name: "currentPassword",
    id: "profile-current-password",
    label: "Senha atual",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    id: "profile-new-password",
    label: "Nova senha",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    id: "profile-confirm-password",
    label: "Confirmar nova senha",
    autoComplete: "new-password",
  },
]

const ChangePasswordForm = () => {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const isSubmitting = form.formState.isSubmitting

  const onSubmit = async (values: ChangePasswordInput) => {
    const result = await changePassword(values)

    if (result.ok) {
      toast.success(result.message)
      form.reset()
      return
    }

    if (result.code === "INVALID_CURRENT_PASSWORD") {
      form.setError(
        "currentPassword",
        { message: result.message },
        { shouldFocus: true },
      )
      return
    }

    if (result.code === "INVALID_INPUT") {
      form.setError(
        "newPassword",
        { message: result.message },
        { shouldFocus: true },
      )
      return
    }

    toast.error(result.message)
  }

  return (
    <FormSchemaProvider form={form} schema={changePasswordSchema}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <FieldGroup className="gap-4">
          {PASSWORD_FIELDS.map((config) => (
            <FormField
              key={config.name}
              control={form.control}
              name={config.name}
              label={config.label}
              id={config.id}
            >
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete={config.autoComplete}
                />
              )}
            </FormField>
          ))}
        </FieldGroup>

        <div>
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
            {isSubmitting ? "Alterando…" : "Alterar senha"}
          </Button>
        </div>
      </form>
    </FormSchemaProvider>
  )
}

export default ChangePasswordForm
