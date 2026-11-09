import { formatCnpj, stripCnpjMask } from "@/app/_lib/domain/brazilian-formats"
import { normalizeSearchText } from "@/app/_lib/domain/search"
import type {
  TicketCompanyFacts,
  TicketCompanyOption,
  TicketCompanySummary,
} from "@/app/_lib/types/ticket-company"

export const TICKET_COMPANY_LABEL = "Empresa"

export const TICKET_COMPANY_SEARCH_PLACEHOLDER = "Buscar empresa…"

export const TICKET_COMPANY_EMPTY_SEARCH_MESSAGE = "Nenhuma empresa encontrada."

export const TICKET_COMPANY_REQUIRED_MESSAGE = "Selecione a empresa."

export const INVALID_TICKET_COMPANY_MESSAGE =
  "Esta empresa não está disponível. Escolha uma empresa ativa."

export const INACTIVE_TICKET_COMPANY_SUFFIX = "(inativa)"

export const MISSING_TICKET_COMPANY_HINT =
  "Este chamado não tem empresa. Escolha uma para salvar."

export const INACTIVE_TICKET_COMPANY_HINT =
  "A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar."

export const isUsableTicketCompany = (
  company: TicketCompanyFacts,
  currentCompanyId: number | null,
): boolean => company.isActive || company.id === currentCompanyId

export const ticketCompanyOptionLabel = (
  company: Pick<TicketCompanyOption, "tradeName" | "cnpj">,
): string => `${company.tradeName} — ${formatCnpj(company.cnpj)}`

export const matchesTicketCompanySearch = (
  company: TicketCompanyOption,
  query: string,
): boolean => {
  const term = normalizeSearchText(query)
  if (term === "") {
    return true
  }
  if (normalizeSearchText(company.tradeName).includes(term)) {
    return true
  }
  const cnpjTerm = stripCnpjMask(query)
  return cnpjTerm !== "" && company.cnpj.includes(cnpjTerm)
}

export const ticketCompanyEditOptionLabel = (
  company: TicketCompanySummary,
): string =>
  company.isActive
    ? ticketCompanyOptionLabel(company)
    : `${ticketCompanyOptionLabel(company)} ${INACTIVE_TICKET_COMPANY_SUFFIX}`

export const ticketCompanyEditOptions = (
  current: TicketCompanySummary | null,
  active: readonly TicketCompanyOption[],
): TicketCompanySummary[] => {
  const options = active.map((company) => ({
    id: company.id,
    tradeName: company.tradeName,
    cnpj: company.cnpj,
    isActive: true,
  }))
  return current !== null && !current.isActive
    ? [
        { ...current },
        ...options.filter((company) => company.id !== current.id),
      ]
    : options
}

export const companyEditHintFor = (
  current: TicketCompanySummary | null,
): string | undefined => {
  if (current === null) return MISSING_TICKET_COMPANY_HINT
  if (!current.isActive) return INACTIVE_TICKET_COMPANY_HINT
  return undefined
}
