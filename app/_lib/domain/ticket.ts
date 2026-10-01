import {
  assignableDepartments,
  isAssignableDepartment,
} from "@/app/_lib/domain/department"
import type {
  DepartmentAvailability,
  DepartmentOption,
} from "@/app/_lib/types/department"
import type { TagOption } from "@/app/_lib/types/tag"
import type {
  InitialTicketStatus,
  NewTicketFormOptions,
  TicketAuthorFacts,
  TicketCreationBlockReason,
  TicketCreationCheck,
  TicketPriority,
  TicketSaved,
  TicketStatus,
  TicketTagFacts,
  TicketType,
} from "@/app/_lib/types/ticket"

const TICKET_STATUS_IS_OPEN = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: true,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export type OpenTicketStatus = {
  [K in TicketStatus]: (typeof TICKET_STATUS_IS_OPEN)[K] extends true
    ? K
    : never
}[TicketStatus]

const isTicketStatus = (value: string): value is TicketStatus =>
  Object.hasOwn(TICKET_STATUS_IS_OPEN, value)

export const isOpenTicketStatus = (
  status: TicketStatus,
): status is OpenTicketStatus => TICKET_STATUS_IS_OPEN[status]

export const OPEN_TICKET_STATUSES: readonly OpenTicketStatus[] = Object.keys(
  TICKET_STATUS_IS_OPEN,
)
  .filter(isTicketStatus)
  .filter(isOpenTicketStatus)

export const TICKET_TYPE_LABELS = {
  duvida: "Dúvida",
  ocorrencia: "Ocorrência",
  solicitacao: "Solicitação",
  sugestao_de_melhoria: "Sugestão de melhoria",
  incidente: "Incidente",
  bug: "Bug",
} satisfies Record<TicketType, string>

const isTicketType = (value: string): value is TicketType =>
  Object.hasOwn(TICKET_TYPE_LABELS, value)

export const TICKET_TYPES: readonly TicketType[] =
  Object.keys(TICKET_TYPE_LABELS).filter(isTicketType)

export const TICKET_TITLE_MIN_LENGTH = 3

export const TICKET_TITLE_MAX_LENGTH = 200

export const TICKET_DESCRIPTION_MIN_LENGTH = 10

export const TICKET_DESCRIPTION_MAX_LENGTH = 5000

export const INITIAL_TICKET_PRIORITY: TicketPriority = "media"

export const formatTicketNumber = (ticketId: number): string => `#${ticketId}`

export const TICKET_CREATION_BLOCK_MESSAGES = {
  USER_INACTIVE:
    "Sua conta está desativada. Não é possível registrar chamados.",
  PASSWORD_CHANGE_REQUIRED: "Defina a sua senha antes de registrar chamados.",
  DEPARTMENT_UNASSIGNED:
    "Seu perfil não está associado a nenhum setor, informe seu administrador.",
  DEPARTMENT_WITHOUT_TAGS:
    "Não há nenhuma Tag disponível para registro de chamados, informe seu administrador.",
} satisfies Record<TicketCreationBlockReason, string>

export const checkTicketCreation = (
  author: TicketAuthorFacts,
  activeTagCount: number,
): TicketCreationCheck => {
  if (!author.isActive) return { ok: false, reason: "USER_INACTIVE" }
  if (author.mustChangePassword) {
    return { ok: false, reason: "PASSWORD_CHANGE_REQUIRED" }
  }
  if (author.isUnassigned) return { ok: false, reason: "DEPARTMENT_UNASSIGNED" }
  if (activeTagCount < 1) {
    return { ok: false, reason: "DEPARTMENT_WITHOUT_TAGS" }
  }
  return { ok: true }
}

export const canReceiveTickets = (
  department: DepartmentAvailability,
): boolean => isAssignableDepartment(department)

export const ticketDestinationDepartments = (
  options: readonly DepartmentOption[],
): DepartmentOption[] =>
  assignableDepartments(options).sort(
    (a, b) => Number(b.isBoard) - Number(a.isBoard),
  )

export const isUsableTicketTag = (
  tag: TicketTagFacts,
  authorDepartmentId: number,
): boolean => tag.isActive && tag.departmentId === authorDepartmentId

export const requiresApproval = (
  originDepartmentId: number,
  destinationDepartmentId: number,
): boolean => originDepartmentId !== destinationDepartmentId

export const initialTicketStatusFor = (
  originDepartmentId: number,
  destinationDepartmentId: number,
): InitialTicketStatus =>
  requiresApproval(originDepartmentId, destinationDepartmentId)
    ? "aguardando_aprovacao"
    : "aberto"

export const buildNewTicketFormOptions = (
  author: TicketAuthorFacts,
  tags: readonly TagOption[],
  departmentOptions: readonly DepartmentOption[],
): NewTicketFormOptions => {
  const check = checkTicketCreation(author, tags.length)
  if (!check.ok) {
    return {
      canCreate: false,
      reason: check.reason,
      message: TICKET_CREATION_BLOCK_MESSAGES[check.reason],
    }
  }

  const destinations = ticketDestinationDepartments(departmentOptions)
  const ownDepartmentListed = destinations.some(
    (option) => option.id === author.departmentId,
  )

  return {
    canCreate: true,
    authorDepartmentId: author.departmentId,
    defaultDestinationId: ownDepartmentListed ? author.departmentId : null,
    tags: [...tags],
    destinations,
  }
}

export const describeApprovalNotice = (destinationName: string): string =>
  `O chamado vai aguardar a aprovação do administrador de ${destinationName}. Depois de enviado, você não poderá mais alterá-lo.`

export const describeTicketCreated = ({
  ticketId,
  ticketStatus,
  destinationDepartmentName,
}: TicketSaved): string =>
  ticketStatus === "aguardando_aprovacao"
    ? `Chamado ${formatTicketNumber(ticketId)} enviado para aprovação de ${destinationDepartmentName}.`
    : `Chamado ${formatTicketNumber(ticketId)} criado.`
