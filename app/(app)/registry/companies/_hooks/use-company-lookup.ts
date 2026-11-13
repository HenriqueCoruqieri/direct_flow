import { useRef, useState } from "react"
import type { UseFormReturn } from "react-hook-form"

import { lookupCep, lookupCnpj } from "@/app/_lib/actions/company-lookup"
import { cleanCep, cleanCnpj } from "@/app/_lib/domain/brazilian-formats"
import {
  CEP_LOOKUP_LOADING_MESSAGE,
  cepLookupFailure,
  CNPJ_LOOKUP_LOADING_MESSAGE,
  cnpjLookupFailure,
  isCepLookupReady,
  isCnpjLookupReady,
  isLookupSettled,
} from "@/app/_lib/domain/company-lookup"
import type {
  CepLookupResponse,
  CnpjLookupResponse,
  CompanyLookupFillEntry,
} from "@/app/_lib/types/company-lookup"
import type {
  CompanyFormValues,
  CreateCompanyInput,
} from "@/app/_lib/validation/company"

export interface CompanyLookupIdle {
  kind: "idle"
}

export interface CompanyLookupLoading {
  kind: "loading"
  message: string
}

export interface CompanyLookupNoticeStatus {
  kind: "notice"
  tone: "neutral" | "warning"
  message: string
}

export type CompanyLookupStatus =
  CompanyLookupIdle | CompanyLookupLoading | CompanyLookupNoticeStatus

export interface CompanyLookupControls {
  cnpjStatus: CompanyLookupStatus
  cepStatus: CompanyLookupStatus
  handleCnpjChange: (value: string) => void
  handleCepChange: (value: string) => void
  reset: (cnpj: string, cep: string) => void
}

type CompanyForm = UseFormReturn<CompanyFormValues, unknown, CreateCompanyInput>

const IDLE: CompanyLookupIdle = { kind: "idle" }

const FILL_OPTIONS = { shouldDirty: true, shouldValidate: true }

const noticeFor = (
  response: CnpjLookupResponse | CepLookupResponse,
): CompanyLookupNoticeStatus => ({
  kind: "notice",
  tone: response.ok ? "neutral" : "warning",
  message: response.message,
})

export const useCompanyLookup = (form: CompanyForm): CompanyLookupControls => {
  const [cnpjStatus, setCnpjStatus] = useState<CompanyLookupStatus>(IDLE)
  const [cepStatus, setCepStatus] = useState<CompanyLookupStatus>(IDLE)
  const lastCnpj = useRef("")
  const lastCep = useRef("")
  const generation = useRef(0)

  const fillField = (entry: CompanyLookupFillEntry) => {
    if (entry.field === "state") {
      form.setValue("state", entry.value, FILL_OPTIONS)
      return
    }
    form.setValue(entry.field, entry.value, FILL_OPTIONS)
    if (entry.field === "cep") {
      lastCep.current = cleanCep(entry.value)
      setCepStatus(IDLE)
    }
  }

  const handleCnpjChange = (value: string) => {
    setCnpjStatus(IDLE)
    const cnpj = cleanCnpj(value)
    if (!isCnpjLookupReady(cnpj) || cnpj === lastCnpj.current) return

    lastCnpj.current = cnpj
    const requestGeneration = generation.current
    setCnpjStatus({ kind: "loading", message: CNPJ_LOOKUP_LOADING_MESSAGE })

    void lookupCnpj({ cnpj })
      .catch(() => cnpjLookupFailure("UNAVAILABLE"))
      .then((response) => {
        if (requestGeneration !== generation.current) return
        if (!isLookupSettled(response) && lastCnpj.current === cnpj) {
          lastCnpj.current = ""
        }
        if (cleanCnpj(form.getValues("cnpj")) !== cnpj) return
        if (response.ok) response.fill.forEach(fillField)
        setCnpjStatus(noticeFor(response))
      })
  }

  const handleCepChange = (value: string) => {
    setCepStatus(IDLE)
    const cep = cleanCep(value)
    if (!isCepLookupReady(cep) || cep === lastCep.current) return

    lastCep.current = cep
    const requestGeneration = generation.current
    setCepStatus({ kind: "loading", message: CEP_LOOKUP_LOADING_MESSAGE })

    void lookupCep({ cep })
      .catch(() => cepLookupFailure("UNAVAILABLE"))
      .then((response) => {
        if (requestGeneration !== generation.current) return
        if (!isLookupSettled(response) && lastCep.current === cep) {
          lastCep.current = ""
        }
        if (cleanCep(form.getValues("cep")) !== cep) return
        if (response.ok) response.fill.forEach(fillField)
        setCepStatus(noticeFor(response))
      })
  }

  const reset = (cnpj: string, cep: string) => {
    generation.current += 1
    lastCnpj.current = cleanCnpj(cnpj)
    lastCep.current = cleanCep(cep)
    setCnpjStatus(IDLE)
    setCepStatus(IDLE)
  }

  return { cnpjStatus, cepStatus, handleCnpjChange, handleCepChange, reset }
}
