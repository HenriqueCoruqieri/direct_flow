"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import PillButton from "@/app/_components/pill-button"
import { Field, FieldError, FieldGroup } from "@/app/_components/ui/field"
import UnderlineInput from "@/app/_components/underline-input"
import { resetPassword } from "@/app/_lib/actions/password-reset"
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/app/_lib/validation/auth"
import AuthFieldLabel from "@/app/(auth)/_components/auth-field-label"

import InvalidResetLink from "./invalid-reset-link"

interface ResetPasswordFormProps {
  token: string
  maskedEmail: string
}

const ResetPasswordForm = ({ token, maskedEmail }: ResetPasswordFormProps) => {
  const [linkInvalid, setLinkInvalid] = useState(false)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = async (values: ResetPasswordInput) => {
    const result = await resetPassword({ ...values, token })

    if (!result) return

    if (result.code === "INVALID_TOKEN") {
      setLinkInvalid(true)
      return
    }

    toast.error(result.message)
  }

  if (linkInvalid) return <InvalidResetLink />

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-col gap-2 pb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Criar nova senha
        </h2>
        <p className="text-base text-muted-foreground">
          Definindo uma nova senha para{" "}
          <span className="font-medium text-foreground">{maskedEmail}</span>
        </p>
      </div>

      <FieldGroup className="gap-5.5">
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1">
              <AuthFieldLabel htmlFor="reset-password">
                Nova senha
              </AuthFieldLabel>
              <UnderlineInput
                {...field}
                id="reset-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "reset-password-error" : undefined
                }
              />
              {fieldState.invalid ? (
                <FieldError
                  id="reset-password-error"
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
              <AuthFieldLabel htmlFor="reset-password-confirm">
                Confirmar nova senha
              </AuthFieldLabel>
              <UnderlineInput
                {...field}
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid
                    ? "reset-password-confirm-error"
                    : undefined
                }
              />
              {fieldState.invalid ? (
                <FieldError
                  id="reset-password-confirm-error"
                  errors={[fieldState.error]}
                />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="mt-auto pt-10">
        <PillButton type="submit" loading={form.formState.isSubmitting}>
          Redefinir senha
        </PillButton>
      </div>
    </form>
  )
}

export default ResetPasswordForm
