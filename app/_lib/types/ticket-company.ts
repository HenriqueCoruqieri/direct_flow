export interface TicketCompanyFacts {
  id: number
  isActive: boolean
}

export interface TicketCompanyRef {
  id: number
  tradeName: string
}

export interface TicketCompanyOption extends TicketCompanyRef {
  cnpj: string
}

export interface TicketCompanySummary
  extends TicketCompanyOption, TicketCompanyFacts {}
