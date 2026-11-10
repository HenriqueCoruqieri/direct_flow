"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { type DefaultValues, useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import MaskedInput from "@/app/_components/masked-input"
import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import { FieldLegend, FieldSet } from "@/app/_components/ui/field"
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

      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <FormSchemaProvider form={form} schema={createCompanySchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="shrink-0 border-b border-border-subtle px-6 pt-6 pb-4">
              <DialogTitle>
                {isEdit ? "Editar empresa" : "Nova empresa"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 scroll-py-6 flex-col gap-6 overflow-y-auto px-6 py-5">
              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>
                  Identificação
                </FieldLegend>
                <div className={TWO_COLUMNS}>
                  <FormField
                    control={form.control}
                    name="cnpj"
                    label="CNPJ"
                    className="sm:col-span-2"
                  >
                    {(field) => (
                      <MaskedInput
                        {...field}
                        clean={cleanCnpj}
                        format={formatCnpj}
                        inputMode="text"
                        autoCapitalize="characters"
                        placeholder={CNPJ_PLACEHOLDER}
                        className="font-mono"
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="legalName"
                    label="Razão social"
                    className="sm:col-span-2"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="tradeName"
                    label="Nome fantasia"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField control={form.control} name="email" label="E-mail">
                    {(field) => (
                      <Input {...field} type="email" autoComplete="off" />
                    )}
                  </FormField>
                </div>
              </FieldSet>

              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>Contatos</FieldLegend>
                <div className={TWO_COLUMNS}>
                  <FormField
                    control={form.control}
                    name="primaryPhone"
                    label="Primário"
                  >
                    {(field) => (
                      <MaskedInput
                        {...field}
                        clean={cleanPhone}
                        format={formatPhone}
                        placeholder={PHONE_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="secondaryPhone"
                    label="Secundário"
                  >
                    {(field) => (
                      <MaskedInput
                        {...field}
                        value={field.value ?? ""}
                        clean={cleanPhone}
                        format={formatPhone}
                        placeholder={PHONE_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                </div>
              </FieldSet>

              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>Endereço</FieldLegend>
                <div className={FOUR_COLUMNS}>
                  <FormField
                    control={form.control}
                    name="cep"
                    label="CEP"
                    className="sm:col-span-2"
                  >
                    {(field) => (
                      <MaskedInput
                        {...field}
                        clean={cleanCep}
                        format={formatCep}
                        placeholder={CEP_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="state"
                    label="UF"
                    className="sm:col-span-2"
                  >
                    {({ name, value, onChange, disabled, ...trigger }) => (
                      <Select
                        name={name}
                        value={value ?? ""}
                        onValueChange={(next) =>
                          onChange(isBrazilianState(next) ? next : undefined)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger {...trigger} className="w-full">
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
                  </FormField>
                  <FormField
                    control={form.control}
                    name="street"
                    label="Logradouro"
                    className="sm:col-span-3"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="number"
                    label="Número"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="district"
                    label="Bairro"
                    className="sm:col-span-2"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="city"
                    label="Cidade"
                    className="sm:col-span-2"
                  >
                    {(field) => <Input {...field} autoComplete="off" />}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="complement"
                    label="Complemento"
                    className="sm:col-span-4"
                  >
                    {(field) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        autoComplete="off"
                        placeholder={COMPANY_COMPLEMENT_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                </div>
              </FieldSet>

              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>Responsável</FieldLegend>
                <div className={TWO_COLUMNS}>
                  <FormField
                    control={form.control}
                    name="managerName"
                    label="Responsável"
                  >
                    {(field) => (
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder={COMPANY_MANAGER_NAME_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="managerPhone"
                    label="Contato do responsável"
                  >
                    {(field) => (
                      <MaskedInput
                        {...field}
                        clean={cleanPhone}
                        format={formatPhone}
                        placeholder={PHONE_PLACEHOLDER}
                      />
                    )}
                  </FormField>
                </div>
              </FieldSet>

              <FieldSet className="gap-0">
                <FieldLegend className={LEGEND_CLASS}>Expediente</FieldLegend>
                <div className={TWO_COLUMNS}>
                  <FormField
                    control={form.control}
                    name="businessDays"
                    label="Dias"
                    labelMode="group"
                    className="sm:col-span-2"
                  >
                    {({
                      ref,
                      value,
                      onChange,
                      onBlur,
                      disabled,
                      id,
                      "aria-invalid": ariaInvalid,
                      "aria-describedby": ariaDescribedBy,
                      "aria-labelledby": ariaLabelledBy,
                    }) => (
                      <ToggleGroup
                        id={id}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedBy}
                        aria-labelledby={ariaLabelledBy}
                        type="multiple"
                        variant="outline"
                        spacing={2}
                        value={(value ?? []).map(String)}
                        onValueChange={(next) =>
                          onChange(next.map(Number).filter(isWeekday))
                        }
                        disabled={disabled}
                        className="flex-wrap"
                      >
                        {WEEKDAYS.map((day, index) => (
                          <ToggleGroupItem
                            key={day}
                            ref={index === 0 ? ref : undefined}
                            value={String(day)}
                            aria-label={WEEKDAY_LABELS[day]}
                            onBlur={onBlur}
                            className="min-w-12 rounded-full data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {WEEKDAY_SHORT_LABELS[day]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    )}
                  </FormField>
                  <FormField control={form.control} name="opensAt" label="Das">
                    {(field) => (
                      <Input {...field} value={field.value ?? ""} type="time" />
                    )}
                  </FormField>
                  <FormField control={form.control} name="closesAt" label="Às">
                    {(field) => (
                      <Input {...field} value={field.value ?? ""} type="time" />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="notes"
                    label="Observação"
                    className="sm:col-span-2"
                  >
                    {(field) => (
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder={COMPANY_NOTES_PLACEHOLDER}
                        className="max-h-48 min-h-20"
                      />
                    )}
                  </FormField>
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
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default CompanyFormDialog
