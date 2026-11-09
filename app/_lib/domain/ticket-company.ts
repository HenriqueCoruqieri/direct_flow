import { formatCnpj } from "@/app/_lib/domain/brazilian-formats"
import type {
  TicketCompanyFacts,
  TicketCompanyOption,
} from "@/app/_lib/types/ticket-company"

export const TICKET_COMPANY_LABEL = "Empresa"

export const TICKET_COMPANY_PLACEHOLDER = "Selecione a empresa"

export const TICKET_COMPANY_SEARCH_PLACEHOLDER = "Buscar empresa…"

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
