"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import PillButton from "@/app/_components/form/pill-button"
import UnderlineInput from "@/app/_components/form/underline-input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/app/_components/ui/field"
import { type LoginInput, loginSchema } from "@/app/_lib/validation/auth"

const LABEL_CLASS =
  "text-xs font-bold uppercase tracking-widest text-muted-foreground"

const LoginForm = () => {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit() {
    toast.info("Autenticação em breve")
  }

  return (
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
              <FieldLabel htmlFor="login-email" className={LABEL_CLASS}>
                E-mail
              </FieldLabel>
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
              <FieldLabel htmlFor="login-password" className={LABEL_CLASS}>
                Senha
              </FieldLabel>
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
                trailing={
                  <button
                    type="button"
                    aria-disabled="true"
                    onClick={() => toast.info("Recuperação de senha em breve")}
                    className="flex min-h-11 cursor-not-allowed items-center rounded-sm text-sm font-bold text-text-secondary opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Esqueci
                  </button>
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
  )
}

export default LoginForm
