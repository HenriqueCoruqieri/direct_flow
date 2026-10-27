import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
} from "@/app/_lib/domain/ticket"
import type {
  TagOption,
  TagPrioritySelectOption,
  TicketPriorityLock,
} from "@/app/_lib/types/tag"
import type { TicketPriority } from "@/app/_lib/types/ticket"

export const TAG_PRIORITY_NONE_VALUE = "none"

export const TAG_PRIORITY_NONE_LABEL = "Sem prioridade (escolhida na abertura)"

export const TAG_PRIORITY_FIELD_HINT =
  "Chamados abertos com esta tag recebem esta prioridade. Mudar aqui não altera chamados já abertos."

export const TAG_PRIORITY_SELECT_OPTIONS: readonly TagPrioritySelectOption[] = [
  { value: TAG_PRIORITY_NONE_VALUE, label: TAG_PRIORITY_NONE_LABEL },
  ...TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
  })),
]

export const tagPriorityToSelectValue = (
  priority: TicketPriority | null,
): string => priority ?? TAG_PRIORITY_NONE_VALUE

export const tagPriorityFromSelectValue = (
  value: string,
): TicketPriority | null =>
  TICKET_PRIORITIES.find((priority) => priority === value) ?? null

export const describeTagPriority = (priority: TicketPriority | null): string =>
  priority === null ? EMPTY_VALUE_LABEL : TICKET_PRIORITY_LABELS[priority]

export const resolveTicketPriority = (
  tagPriority: TicketPriority | null,
  chosen: TicketPriority,
): TicketPriority => tagPriority ?? chosen

export const tagPriorityHint = (tagName: string): string =>
  `Definida pela tag ${tagName}`

export const ticketPriorityLockFor = (
  tags: readonly TagOption[],
  tagId: number | null | undefined,
): TicketPriorityLock | null => {
  const selected = tags.find((option) => option.id === tagId)
  if (!selected || selected.priority === null) return null
  return { priority: selected.priority, hint: tagPriorityHint(selected.name) }
}

export const ticketPriorityOnTagChange = (
  tags: readonly TagOption[],
  previousTagId: number | null | undefined,
  nextTagId: number | null | undefined,
  current: TicketPriority | undefined,
): TicketPriority | undefined => {
  const nextLock = ticketPriorityLockFor(tags, nextTagId)
  if (nextLock) return nextLock.priority
  if (ticketPriorityLockFor(tags, previousTagId)) return undefined
  return current
}
