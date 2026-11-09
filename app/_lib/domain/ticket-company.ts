import { formatCnpj, stripCnpjMask } from "@/app/_lib/domain/brazilian-formats"
import { normalizeSearchText } from "@/app/_lib/domain/search"
import type {
  TicketCompanyFacts,
  TicketCompanyOption,
} from "@/app/_lib/types/ticket-company"

export const TICKET_COMPANY_LABEL = "Empresa"

export const TICKET_COMPANY_SEARCH_PLACEHOLDER = "Buscar empresa…"

export const TICKET_COMPANY_EMPTY_SEARCH_MESSAGE = "Nenhuma empresa encontrada."

export const TICKET_COMPANY_REQUIRED_MESSAGE = "Selecione a empresa."

export const INVALID_TICKET_COMPANY_MESSAGE =
  "Esta empresa não está disponível. Escolha uma empresa ativa."

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
