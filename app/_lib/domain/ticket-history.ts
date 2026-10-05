import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/app/_lib/domain/ticket"
import type {
  HistoryEvent,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
} from "@/app/_lib/types/ticket"

export const HISTORY_EVENT_LABELS = {
  criacao: "Abertura",
  mudanca_status: "Mudança de status",
  mudanca_prioridade: "Mudança de prioridade",
  atribuicao: "Atribuição",
  transferencia_solicitada: "Transferência solicitada",
  transferencia_aprovada: "Transferência aprovada",
  transferencia_rejeitada: "Transferência recusada",
  reabertura: "Reabertura",
  encerramento: "Encerramento",
  mudanca_tag: "Mudança de tag",
  edicao: "Edição",
  resolucao: "Resolução",
} satisfies Record<HistoryEvent, string>

const statusLabel = (status: TicketStatus | null): string | null =>
  status ? TICKET_STATUS_LABELS[status] : null

const priorityLabel = (priority: TicketPriority | null): string | null =>
  priority ? TICKET_PRIORITY_LABELS[priority] : null

const fromTo = (from: string | null, to: string | null): string => {
  if (from && to) return ` de ${from} para ${to}`
  if (to) return ` para ${to}`
  if (from) return ` de ${from}`
  return ""
}

const withStatus = (status: TicketStatus | null): string => {
  const label = statusLabel(status)
  return label ? ` com status ${label}` : ""
}

interface ReplacementTexts {
  set: (to: string) => string
  replaced: (from: string, to: string) => string
  removed: (from: string) => string
  unknown: string
}

const replacement = (
  from: string | null,
  to: string | null,
  texts: ReplacementTexts,
): string => {
  if (from && to) return texts.replaced(from, to)
  if (to) return texts.set(to)
  if (from) return texts.removed(from)
  return texts.unknown
}

type HistoryEntryDescriber = (entry: TicketHistoryEntry) => string

const HISTORY_EVENT_DESCRIBERS = {
  criacao: (entry) =>
    `Abriu o chamado${entry.toDepartmentName ? ` em ${entry.toDepartmentName}` : ""}${withStatus(entry.toStatus)}.`,
  mudanca_status: (entry) =>
    `Alterou o status${fromTo(statusLabel(entry.fromStatus), statusLabel(entry.toStatus))}.`,
  mudanca_prioridade: (entry) =>
    `Alterou a prioridade${fromTo(priorityLabel(entry.fromPriority), priorityLabel(entry.toPriority))}.`,
  atribuicao: (entry) =>
    replacement(entry.fromAssigneeName, entry.toAssigneeName, {
      set: (to) => `Atribuiu o chamado a ${to}.`,
      replaced: (from, to) => `Trocou o responsável de ${from} para ${to}.`,
      removed: (from) => `Removeu ${from} como responsável.`,
      unknown: "Alterou o responsável.",
    }),
  transferencia_solicitada: (entry) =>
    `Solicitou a transferência${fromTo(entry.fromDepartmentName, entry.toDepartmentName)}.`,
  transferencia_aprovada: (entry) =>
    `Aprovou a transferência${fromTo(entry.fromDepartmentName, entry.toDepartmentName)}.`,
  transferencia_rejeitada: (entry) =>
    `Recusou a transferência${fromTo(entry.fromDepartmentName, entry.toDepartmentName)}.`,
  reabertura: (entry) => `Reabriu o chamado${withStatus(entry.toStatus)}.`,
  encerramento: (entry) => `Encerrou o chamado${withStatus(entry.toStatus)}.`,
  mudanca_tag: (entry) =>
    replacement(entry.fromTagName, entry.toTagName, {
      set: (to) => `Definiu a tag ${to}.`,
      replaced: (from, to) => `Trocou a tag de ${from} para ${to}.`,
      removed: (from) => `Removeu a tag ${from}.`,
      unknown: "Alterou a tag.",
    }),
  edicao: () => "Editou o chamado.",
  resolucao: () => "Resolveu o chamado.",
} satisfies Record<HistoryEvent, HistoryEntryDescriber>

export const describeHistoryEntry = (entry: TicketHistoryEntry): string =>
  HISTORY_EVENT_DESCRIBERS[entry.event](entry)

export const SYSTEM_ACTOR_LABEL = "Sistema"

export const describeHistoryActor = (
  entry: Pick<TicketHistoryEntry, "changedByName">,
): string => entry.changedByName ?? SYSTEM_ACTOR_LABEL
