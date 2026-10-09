import { queueAssigneeLabel } from "@/app/_lib/domain/ticket-assignee"
import type { TagOption } from "@/app/_lib/types/tag"
import type {
  AssigneeOption,
  NewTicketFormOptions,
  TicketAuthorFacts,
  TicketCreationBlockReason,
  TicketCreationCheck,
  TicketCreatorFacts,
  TicketPendingTransfer,
  TicketPriority,
  TicketStatus,
  TicketTagFacts,
  TicketType,
  TicketViewerFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"

export const TICKET_STATUS_LABELS = {
  aberto: "Aberto",
  em_analise: "Em análise",
  encaminhado: "Encaminhado",
  aguardando_aprovacao: "Aguardando aprovação",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
  cancelado: "Cancelado",
} satisfies Record<TicketStatus, string>

const isTicketStatus = (value: string): value is TicketStatus =>
  Object.hasOwn(TICKET_STATUS_LABELS, value)

export const TICKET_STATUSES: readonly TicketStatus[] =
  Object.keys(TICKET_STATUS_LABELS).filter(isTicketStatus)

type TicketStatusFlags = Record<TicketStatus, boolean>

type StatusesFlagged<
  TFlags extends TicketStatusFlags,
  TValue extends boolean,
> = {
  [K in TicketStatus]: TFlags[K] extends TValue ? K : never
}[TicketStatus]

const TICKET_STATUS_IS_OPEN = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: true,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies TicketStatusFlags

export type OpenTicketStatus = StatusesFlagged<
  typeof TICKET_STATUS_IS_OPEN,
  true
>

export const isOpenTicketStatus = (
  status: TicketStatus,
): status is OpenTicketStatus => TICKET_STATUS_IS_OPEN[status]

export const OPEN_TICKET_STATUSES: readonly OpenTicketStatus[] =
  TICKET_STATUSES.filter(isOpenTicketStatus)

const TICKET_STATUS_IS_FINAL = {
  aberto: false,
  em_analise: false,
  encaminhado: false,
  aguardando_aprovacao: false,
  em_andamento: false,
  resolvido: false,
  fechado: true,
  cancelado: true,
} as const satisfies TicketStatusFlags

export type NonFinalTicketStatus = StatusesFlagged<
  typeof TICKET_STATUS_IS_FINAL,
  false
>

export const isNonFinalTicketStatus = (
  status: TicketStatus,
): status is NonFinalTicketStatus => !TICKET_STATUS_IS_FINAL[status]

export const NON_FINAL_TICKET_STATUSES: readonly NonFinalTicketStatus[] =
  TICKET_STATUSES.filter(isNonFinalTicketStatus)

export const TICKET_PRIORITY_LABELS = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
} satisfies Record<TicketPriority, string>

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

export const RESOLVED_TICKET_STATUS =
  "resolvido" as const satisfies TicketStatus

export const CLOSED_TICKET_STATUS: TicketStatus = "fechado"

export const AWAITING_APPROVAL_TICKET_STATUS =
  "aguardando_aprovacao" as const satisfies TicketStatus

export type ActiveTicketStatus = Exclude<
  NonFinalTicketStatus,
  typeof RESOLVED_TICKET_STATUS
>

export const isActiveTicketStatus = (
  status: TicketStatus,
): status is ActiveTicketStatus =>
  isNonFinalTicketStatus(status) && status !== RESOLVED_TICKET_STATUS

export const ACTIVE_TICKET_STATUSES: readonly ActiveTicketStatus[] =
  TICKET_STATUSES.filter(isActiveTicketStatus)

export const formatTicketNumber = (ticketId: number): string => `#${ticketId}`

export const ticketDetailPath = (ticketId: number): string =>
  `/tickets/${ticketId}`

export const TICKET_NOT_FOUND_MESSAGE = "Chamado não encontrado."

export const canViewTicket = (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
): boolean => {
  const isAuthor = ticket.createdBy === viewer.userId
  const isAssignee = ticket.assignedTo === viewer.userId
  const isInCurrentDepartment =
    ticket.currentDepartmentId === viewer.departmentId
  const isDirector = viewer.isBoard
  return isAuthor || isAssignee || isInCurrentDepartment || isDirector
}

export const describePendingTransfer = ({
  toDepartmentName,
}: TicketPendingTransfer): string =>
  `Aguardando aprovação de ${toDepartmentName}`

export const TICKET_CREATION_BLOCK_MESSAGES = {
  USER_INACTIVE:
    "Sua conta está desativada. Não é possível registrar chamados.",
  PASSWORD_CHANGE_REQUIRED: "Defina a sua senha antes de registrar chamados.",
  DEPARTMENT_UNASSIGNED:
    "Seu perfil não está associado a nenhum setor, informe sua liderança.",
  DEPARTMENT_WITHOUT_TAGS:
    "Não há nenhuma Tag disponível para registro de chamados, informe sua liderança.",
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

export const isUsableTicketTag = (
  tag: TicketTagFacts,
  authorDepartmentId: number,
): boolean => tag.isActive && tag.departmentId === authorDepartmentId

export const buildNewTicketFormOptions = (
  author: TicketAuthorFacts,
  creator: TicketCreatorFacts,
  departmentName: string,
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[],
): NewTicketFormOptions => {
  const check = checkTicketCreation(author, tags.length)
  if (!check.ok) {
    return {
      canCreate: false,
      reason: check.reason,
      message: TICKET_CREATION_BLOCK_MESSAGES[check.reason],
    }
  }

  return {
    canCreate: true,
    tags: [...tags],
    assignees: [...assignees],
    creatorName: creator.name,
    queueLabel: queueAssigneeLabel(departmentName),
    defaults: {
      title: "",
      description: "",
      assigneeId: null,
    },
  }
}

export const describeTicketCreated = (ticketId: number): string =>
  `Chamado ${formatTicketNumber(ticketId)} criado.`
