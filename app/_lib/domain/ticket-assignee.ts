import type {
  AssigneeOption,
  TicketAssigneeFacts,
} from "@/app/_lib/types/ticket"

export const TICKET_CREATOR_LABEL = "Criador"

export const TICKET_ASSIGNEE_LABEL = "Destinatário"

export const UNAVAILABLE_ASSIGNEE_HINT =
  "O destinatário atual não está disponível. Escolha uma pessoa ativa do seu setor."

export const MISSING_ASSIGNEE_HINT =
  "Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor."

export const isUsableTicketAssignee = (
  person: TicketAssigneeFacts,
  ticketDepartmentId: number,
): boolean => person.isActive && person.departmentId === ticketDepartmentId

const isListedAssignee = (
  assigneeId: number,
  assignees: readonly AssigneeOption[],
): boolean => assignees.some((assignee) => assignee.id === assigneeId)

export const preselectedAssigneeId = (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
): number | undefined =>
  assigneeId !== null && isListedAssignee(assigneeId, assignees)
    ? assigneeId
    : undefined

export const assigneeEditHintFor = (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
): string | undefined => {
  if (assigneeId === null) return MISSING_ASSIGNEE_HINT
  return isListedAssignee(assigneeId, assignees)
    ? undefined
    : UNAVAILABLE_ASSIGNEE_HINT
}
