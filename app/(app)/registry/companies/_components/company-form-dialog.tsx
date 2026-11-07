"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, type DefaultValues, useForm } from "react-hook-form"
import { toast } from "sonner"

import MaskedInput from "@/app/_components/masked-input"
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
  FieldError,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { Textarea } from "@/app/_components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/app/_components/ui/toggle-group"
import { createCompany, updateCompany } from "@/app/_lib/actions/companies"
import {
  BRAZILIAN_STATES,
  brazilianStateLabel,
  CEP_PLACEHOLDER,
  cleanCep,
  cleanCnpj,
  cleanPhone,
  CNPJ_PLACEHOLDER,
  formatCep,
  formatCnpj,
  formatPhone,
  isBrazilianState,
  PHONE_PLACEHOLDER,
} from "@/app/_lib/domain/brazilian-formats"
import {
  COMPANY_COMPLEMENT_PLACEHOLDER,
  COMPANY_MANAGER_NAME_PLACEHOLDER,
  COMPANY_NOTES_PLACEHOLDER,
  COMPANY_REQUIRED_FIELDS_HINT,
  isWeekday,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  WEEKDAYS,
} from "@/app/_lib/domain/company"
import type { CompanyListItem } from "@/app/_lib/types/company"
import {
  type CompanyFormValues,
  type CreateCompanyInput,
  createCompanySchema,
} from "@/app/_lib/validation/company"

import CompanyFormField from "./company-form-field"

const EMPTY_VALUES: DefaultValues<CompanyFormValues> = {
  cnpj: "",
  legalName: "",
  tradeName: "",
  email: "",
  primaryPhone: "",
  secondaryPhone: "",
  cep: "",
  state: undefined,
  street: "",
  number: "",
  district: "",
  city: "",
  complement: "",
  managerName: "",
  managerPhone: "",
  businessDays: [],
  opensAt: "",
  closesAt: "",
  notes: "",
}

interface CreateCompanyFormDialogProps {
  mode: "create"
}

interface EditCompanyFormDialogProps {
  mode: "edit"
  company: CompanyListItem
}

type CompanyFormDialogProps =
  CreateCompanyFormDialogProps | EditCompanyFormDialogProps

const initialValuesFor = (
  props: CompanyFormDialogProps,
): DefaultValues<CompanyFormValues> => {
  if (props.mode === "create") return EMPTY_VALUES
  const { company } = props
  return {
    cnpj: formatCnpj(company.cnpj),
    legalName: company.legalName,
    tradeName: company.tradeName,
    email: company.email,
    primaryPhone: formatPhone(company.primaryPhone),
    secondaryPhone: formatPhone(company.secondaryPhone ?? ""),
    cep: formatCep(company.cep),
    state: company.state,
    street: company.street,
    number: company.number,
    district: company.district,
    city: company.city,
    complement: company.complement ?? "",
    managerName: company.managerName,
    managerPhone: formatPhone(company.managerPhone),
    businessDays: company.businessDays ?? [],
    opensAt: company.opensAt ?? "",
    closesAt: company.closesAt ?? "",
    notes: company.notes ?? "",
  }
}

const LEGEND_CLASS =
  "mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase"

const TWO_COLUMNS = "grid grid-cols-1 gap-4 sm:grid-cols-2"

const FOUR_COLUMNS = "grid grid-cols-1 gap-4 sm:grid-cols-4"

const CompanyFormDialog = (props: CompanyFormDialogProps) => {
  const baseId = useId()
  const idFor = (name: keyof CompanyFormValues) => `${baseId}-${name}`
  const daysLabelId = `${baseId}-days-label`
  const daysErrorId = `${baseId}-days-error`
  const [open, setOpen] = useState(false)

  const form = useForm<CompanyFormValues, unknown, CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: initialValuesFor(props),
  })

  const isSubmitting = form.formState.isSubmitting
  const isEdit = props.mode === "edit"

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(initialValuesFor(props))
    setOpen(nextOpen)
  }

  const onSubmit = async (values: CreateCompanyInput) => {
    const result =
      props.mode === "edit"
        ? await updateCompany({ id: props.company.id, ...values })
        : await createCompany(values)

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    if (result.code === "CNPJ_TAKEN") {
      form.setError("cnpj", { message: result.message }, { shouldFocus: true })
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
            aria-label={`Editar ${props.company.tradeName}`}
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Nova empresa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-border-subtle px-6 pt-6 pb-4">
            <DialogTitle>
              {isEdit ? "Editar empresa" : "Nova empresa"}
            </DialogTitle>
            <DialogDescription>
              {COMPANY_REQUIRED_FIELDS_HINT}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 scroll-py-6 flex-col gap-6 overflow-y-auto px-6 py-5">
            <FieldSet className="gap-0">
              <FieldLegend className={LEGEND_CLASS}>Identificação</FieldLegend>
              <div className={TWO_COLUMNS}>
                <Controller
                  name="cnpj"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("cnpj")}
                      label="CNPJ"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <MaskedInput
                          {...control}
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clean={cleanCnpj}
                          format={formatCnpj}
                          inputMode="text"
                          autoCapitalize="characters"
                          placeholder={CNPJ_PLACEHOLDER}
                          className="font-mono"
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="legalName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("legalName")}
                      label="Razão social"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="tradeName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("tradeName")}
                      label="Nome fantasia"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("email")}
                      label="E-mail"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input
                          {...field}
                          {...control}
                          type="email"
                          autoComplete="off"
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet className="gap-0">
              <FieldLegend className={LEGEND_CLASS}>Contatos</FieldLegend>
              <div className={TWO_COLUMNS}>
                <Controller
                  name="primaryPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("primaryPhone")}
                      label="Primário"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <MaskedInput
                          {...control}
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clean={cleanPhone}
                          format={formatPhone}
                          placeholder={PHONE_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="secondaryPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("secondaryPhone")}
                      label="Secundário"
                      error={fieldState.error}
                    >
                      {(control) => (
                        <MaskedInput
                          {...control}
                          ref={field.ref}
                          name={field.name}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clean={cleanPhone}
                          format={formatPhone}
                          placeholder={PHONE_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet className="gap-0">
              <FieldLegend className={LEGEND_CLASS}>Endereço</FieldLegend>
              <div className={FOUR_COLUMNS}>
                <Controller
                  name="cep"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("cep")}
                      label="CEP"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <MaskedInput
                          {...control}
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clean={cleanCep}
                          format={formatCep}
                          placeholder={CEP_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="state"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("state")}
                      label="UF"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <Select
                          name={field.name}
                          value={field.value ?? ""}
                          onValueChange={(next) =>
                            field.onChange(
                              isBrazilianState(next) ? next : undefined,
                            )
                          }
                          disabled={field.disabled}
                        >
                          <SelectTrigger
                            {...control}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            className="w-full"
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRAZILIAN_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {brazilianStateLabel(state)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="street"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("street")}
                      label="Logradouro"
                      required
                      error={fieldState.error}
                      className="sm:col-span-3"
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="number"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("number")}
                      label="Número"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="district"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("district")}
                      label="Bairro"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="city"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("city")}
                      label="Cidade"
                      required
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <Input {...field} {...control} autoComplete="off" />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="complement"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("complement")}
                      label="Complemento"
                      error={fieldState.error}
                      className="sm:col-span-4"
                    >
                      {(control) => (
                        <Input
                          {...field}
                          {...control}
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder={COMPANY_COMPLEMENT_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet className="gap-0">
              <FieldLegend className={LEGEND_CLASS}>Responsável</FieldLegend>
              <div className={TWO_COLUMNS}>
                <Controller
                  name="managerName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("managerName")}
                      label="Responsável"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input
                          {...field}
                          {...control}
                          autoComplete="off"
                          placeholder={COMPANY_MANAGER_NAME_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="managerPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("managerPhone")}
                      label="Contato do responsável"
                      required
                      error={fieldState.error}
                    >
                      {(control) => (
                        <MaskedInput
                          {...control}
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clean={cleanPhone}
                          format={formatPhone}
                          placeholder={PHONE_PLACEHOLDER}
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet className="gap-0">
              <FieldLegend className={LEGEND_CLASS}>Expediente</FieldLegend>
              <div className={TWO_COLUMNS}>
                <Controller
                  name="businessDays"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="gap-1.5 sm:col-span-2"
                    >
                      <FieldTitle id={daysLabelId}>Dias</FieldTitle>
                      <ToggleGroup
                        type="multiple"
                        variant="outline"
                        spacing={2}
                        value={(field.value ?? []).map(String)}
                        onValueChange={(next) =>
                          field.onChange(next.map(Number).filter(isWeekday))
                        }
                        disabled={field.disabled}
                        aria-labelledby={daysLabelId}
                        aria-invalid={fieldState.invalid}
                        aria-describedby={
                          fieldState.invalid ? daysErrorId : undefined
                        }
                        className="flex-wrap"
                      >
                        {WEEKDAYS.map((day, index) => (
                          <ToggleGroupItem
                            key={day}
                            ref={index === 0 ? field.ref : undefined}
                            value={String(day)}
                            aria-label={WEEKDAY_LABELS[day]}
                            onBlur={field.onBlur}
                            className="min-w-12 rounded-full data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {WEEKDAY_SHORT_LABELS[day]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      {fieldState.invalid ? (
                        <FieldError
                          id={daysErrorId}
                          errors={[fieldState.error]}
                        />
                      ) : null}
                    </Field>
                  )}
                />
                <Controller
                  name="opensAt"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("opensAt")}
                      label="Das"
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input
                          {...field}
                          {...control}
                          value={field.value ?? ""}
                          type="time"
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="closesAt"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("closesAt")}
                      label="Às"
                      error={fieldState.error}
                    >
                      {(control) => (
                        <Input
                          {...field}
                          {...control}
                          value={field.value ?? ""}
                          type="time"
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
                <Controller
                  name="notes"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <CompanyFormField
                      id={idFor("notes")}
                      label="Observação"
                      error={fieldState.error}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <Textarea
                          {...field}
                          {...control}
                          value={field.value ?? ""}
                          placeholder={COMPANY_NOTES_PLACEHOLDER}
                          className="max-h-48 min-h-20"
                        />
                      )}
                    </CompanyFormField>
                  )}
                />
              </div>
            </FieldSet>
          </div>

          <DialogFooter className="m-0 shrink-0 px-6 py-4">
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
                  : "Salvar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CompanyFormDialog
