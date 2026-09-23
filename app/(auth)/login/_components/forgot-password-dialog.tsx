"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { XIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import PillButton from "@/app/_components/pill-button"
import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import { Field, FieldError } from "@/app/_components/ui/field"
import UnderlineInput from "@/app/_components/underline-input"
import { requestPasswordReset } from "@/app/_lib/actions/password-reset"
import { PASSWORD_RESET_TTL_MINUTES } from "@/app/_lib/domain/password-reset"
import {
  type RequestPasswordResetInput,
  requestPasswordResetSchema,
} from "@/app/_lib/validation/auth"
import AuthFieldLabel from "@/app/(auth)/_components/auth-field-label"

const ForgotPasswordDialog = () => {
  const [open, setOpen] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSentMessage(null)
      form.reset()
    }

    setOpen(nextOpen)
  }

  const onSubmit = async (values: RequestPasswordResetInput) => {
    const result = await requestPasswordReset(values)

    if (result.ok) {
      setSentMessage(result.message)
      return
    }

    form.setError("email", { message: result.message })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground transition-colors hover:text-primary-hover"
        >
          Esqueci minha senha
        </button>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="gap-6 p-6">
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fechar"
            className="absolute top-2 right-2"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle>
            {sentMessage ? "Verifique seu e-mail" : "Esqueci minha senha"}
          </DialogTitle>
          <DialogDescription>
            {sentMessage ??
              "Informe o e-mail da sua conta para receber o link de redefinição."}
          </DialogDescription>
        </DialogHeader>

        {sentMessage ? (
          <div role="status" className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              O link vale por {PASSWORD_RESET_TTL_MINUTES} minutos e pode ser
              usado uma única vez.
            </p>
            <DialogClose asChild>
              <PillButton>Fechar</PillButton>
            </DialogClose>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8"
          >
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1">
                  <AuthFieldLabel htmlFor="forgot-password-email">
                    E-mail
                  </AuthFieldLabel>
                  <UnderlineInput
                    {...field}
                    id="forgot-password-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="nome@empresa.com.br"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid
                        ? "forgot-password-email-error"
                        : undefined
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError
                      id="forgot-password-email-error"
                      errors={[fieldState.error]}
                    />
                  ) : null}
                </Field>
              )}
            />

            <PillButton type="submit" loading={form.formState.isSubmitting}>
              Enviar link
            </PillButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ForgotPasswordDialog
