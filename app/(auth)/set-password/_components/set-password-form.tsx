"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import PillButton from "@/app/_components/pill-button"
import { Field, FieldError, FieldGroup } from "@/app/_components/ui/field"
import UnderlineInput from "@/app/_components/underline-input"
import { signOut } from "@/app/_lib/actions/auth"
import { definePassword } from "@/app/_lib/actions/password-setup"
import {
  type DefinePasswordInput,
  definePasswordSchema,
} from "@/app/_lib/validation/password"
import AuthFieldLabel from "@/app/(auth)/_components/auth-field-label"

const SetPasswordForm = () => {
  const form = useForm<DefinePasswordInput>({
    resolver: zodResolver(definePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  const onSubmit = async (values: DefinePasswordInput) => {
    const result = await definePassword(values)

    if (!result) return

    if (result.code === "SAME_AS_DEFAULT" || result.code === "INVALID_INPUT") {
      form.setError("newPassword", { message: result.message })
      return
    }

    toast.error(result.message)
  }

  return (
    <div className="flex flex-1 flex-col">
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-col gap-2 pb-8">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Defina sua senha
          </h2>
          <p className="text-base text-muted-foreground">
            Este é seu primeiro acesso ou sua senha foi restaurada. Crie uma
            senha pessoal para continuar. Depois disso, a senha padrão deixa de
            valer.
          </p>
        </div>

        <FieldGroup className="gap-5.5">
          <Controller
            name="newPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <AuthFieldLabel htmlFor="set-password">
                  Nova senha
                </AuthFieldLabel>
                <UnderlineInput
                  {...field}
                  id="set-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.invalid ? "set-password-error" : undefined
                  }
                />
                {fieldState.invalid ? (
                  <FieldError
                    id="set-password-error"
                    errors={[fieldState.error]}
                  />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <AuthFieldLabel htmlFor="set-password-confirm">
                  Confirmar nova senha
                </AuthFieldLabel>
                <UnderlineInput
                  {...field}
                  id="set-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.invalid
                      ? "set-password-confirm-error"
                      : undefined
                  }
                />
                {fieldState.invalid ? (
                  <FieldError
                    id="set-password-confirm-error"
                    errors={[fieldState.error]}
                  />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="mt-auto pt-10">
          <PillButton type="submit" loading={form.formState.isSubmitting}>
            Definir senha
          </PillButton>
        </div>
      </form>

      <form action={signOut} className="mt-4 flex items-center justify-center">
        <button
          type="submit"
          className="text-xs text-muted-foreground transition-colors hover:text-primary-hover"
        >
          Sair
        </button>
      </form>
    </div>
  )
}

export default SetPasswordForm
