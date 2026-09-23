"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import PillButton from "@/app/_components/pill-button"
import { Field, FieldError, FieldGroup } from "@/app/_components/ui/field"
import UnderlineInput from "@/app/_components/underline-input"
import { signIn } from "@/app/_lib/actions/auth"
import { type LoginInput, loginSchema } from "@/app/_lib/validation/auth"
import AuthFieldLabel from "@/app/(auth)/_components/auth-field-label"

import ForgotPasswordDialog from "./forgot-password-dialog"

const LoginForm = () => {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginInput) => {
    const result = await signIn(values)

    if (result) toast.error(result.message)
  }

  return (
    <div className="flex flex-1 flex-col">
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col"
      >
        <FieldGroup className="gap-5.5">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <AuthFieldLabel htmlFor="login-email">E-mail</AuthFieldLabel>
                <UnderlineInput
                  {...field}
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@empresa.com.br"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.invalid ? "login-email-error" : undefined
                  }
                />
                {fieldState.invalid ? (
                  <FieldError
                    id="login-email-error"
                    errors={[fieldState.error]}
                  />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <AuthFieldLabel htmlFor="login-password">Senha</AuthFieldLabel>
                <UnderlineInput
                  {...field}
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.invalid ? "login-password-error" : undefined
                  }
                />
                {fieldState.invalid ? (
                  <FieldError
                    id="login-password-error"
                    errors={[fieldState.error]}
                  />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="mt-auto pt-10">
          <PillButton type="submit" loading={form.formState.isSubmitting}>
            Entrar
          </PillButton>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center">
        <ForgotPasswordDialog />
      </div>
    </div>
  )
}

export default LoginForm
