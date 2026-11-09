export interface TicketCompanyFacts {
  id: number
  isActive: boolean
}

export interface TicketCompanyOption {
  id: number
  tradeName: string
  cnpj: string
}

export interface TicketCompanySummary
  extends TicketCompanyOption, TicketCompanyFacts {}
