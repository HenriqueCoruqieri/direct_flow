import { HOUR_MS } from "@/app/_lib/date"
import {
  assignableDepartments,
  canManageDepartmentSettings,
} from "@/app/_lib/domain/department"
import { lastChangeLabel } from "@/app/_lib/domain/labels"
import { DUE_HOURS_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import { TICKET_PRIORITY_LABELS } from "@/app/_lib/domain/ticket"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  DeclinedDueFacts,
  DepartmentDueHours,
  DepartmentDueHoursRecord,
  DepartmentDueHoursView,
  DueHoursField,
  DueHoursFieldCopy,
} from "@/app/_lib/types/department-due-hours"
import type {
  RegistryAccess,
  RegistryTargetDepartment,
} from "@/app/_lib/types/registry"
import type { TicketPriority } from "@/app/_lib/types/ticket"

export const DUE_HOURS_DEPARTMENT_PARAM = "setor"

export const DUE_HOURS_MIN = 1

export const DUE_HOURS_MAX = 999

export const DEFAULT_DEPARTMENT_DUE_HOURS = {
  criticaHours: 3,
  altaHours: 6,
  mediaHours: 12,
  baixaHours: 24,
} satisfies DepartmentDueHours

export const DUE_HOURS_FIELD_BY_PRIORITY = {
  critica: "criticaHours",
  alta: "altaHours",
  media: "mediaHours",
  baixa: "baixaHours",
} satisfies Record<TicketPriority, DueHoursField>

export const DUE_HOURS_PRIORITIES = [
  "critica",
  "alta",
  "media",
  "baixa",
] as const satisfies readonly TicketPriority[]

export const DUE_HOURS_FIELDS: readonly DueHoursField[] =
  DUE_HOURS_PRIORITIES.map((priority) => DUE_HOURS_FIELD_BY_PRIORITY[priority])

export const dueHoursFor = (
  hours: DepartmentDueHours | null,
  priority: TicketPriority,
): number =>
  (hours ?? DEFAULT_DEPARTMENT_DUE_HOURS)[DUE_HOURS_FIELD_BY_PRIORITY[priority]]

export const departmentDueAtFrom = (
  start: Date,
  hours: DepartmentDueHours | null,
  priority: TicketPriority,
): Date => new Date(start.getTime() + dueHoursFor(hours, priority) * HOUR_MS)

export const declinedDueAtFor = (facts: DeclinedDueFacts): Date => {
  if (facts.fromDueAt === null) {
    return departmentDueAtFrom(
      facts.returnedAt,
      facts.returnDepartmentHours,
      facts.priority,
    )
  }
  const pausedMs = Math.max(
    facts.returnedAt.getTime() - facts.sentAt.getTime(),
    0,
  )
  return new Date(facts.fromDueAt.getTime() + pausedMs)
}

export const canEditDepartmentDueHours = (
  access: RegistryAccess,
  target: RegistryTargetDepartment,
): boolean => canManageDepartmentSettings(access, target)

export const dueHoursDepartmentOptions = (
  access: RegistryAccess,
  options: readonly DepartmentOption[],
): DepartmentOption[] =>
  access.kind === "director" ? assignableDepartments(options) : []

export const dueHoursDepartmentIdFor = (
  access: RegistryAccess,
  requestedDepartmentId: number | null,
  options: readonly DepartmentOption[],
): number | null => {
  if (access.kind === "none") return null
  if (access.kind !== "director" || requestedDepartmentId === null) {
    return access.departmentId
  }
  return options.some((option) => option.id === requestedDepartmentId)
    ? requestedDepartmentId
    : access.departmentId
}

export const dueHoursHref = (
  access: RegistryAccess,
  departmentId: number,
): string =>
  access.kind === "director" && departmentId !== access.departmentId
    ? `${DUE_HOURS_REGISTRY_PATH}?${new URLSearchParams({ [DUE_HOURS_DEPARTMENT_PARAM]: String(departmentId) }).toString()}`
    : DUE_HOURS_REGISTRY_PATH

export const dueHoursViewFor = (
  record: DepartmentDueHoursRecord | null,
): DepartmentDueHoursView =>
  record === null
    ? { hours: DEFAULT_DEPARTMENT_DUE_HOURS, isDefault: true, lastChange: null }
    : {
        hours: {
          criticaHours: record.criticaHours,
          altaHours: record.altaHours,
          mediaHours: record.mediaHours,
          baixaHours: record.baixaHours,
        },
        isDefault: false,
        lastChange: lastChangeLabel(record),
      }

export const DUE_HOURS_DEPARTMENT_FILTER_LABEL = "Setor"

export const DUE_HOURS_PAGE_TITLE = "Prazos"

export const DUE_HOURS_ADMIN_DESCRIPTION =
  "Defina o prazo de atendimento, em horas corridas, de cada prioridade dos chamados do seu setor."

export const DUE_HOURS_DIRECTOR_DESCRIPTION =
  "Defina o prazo de atendimento, em horas corridas, de cada prioridade dos chamados de qualquer setor."

export const DUE_HOURS_APPLIES_FROM_NOW_HINT =
  "Os prazos valem para chamados abertos ou aceitos a partir de agora. Chamados em andamento mantêm o prazo que já têm."

export const DUE_HOURS_DEFAULT_BADGE = "Padrão do sistema"

const defaultHoursSummary = DUE_HOURS_PRIORITIES.map(
  (priority) =>
    `${TICKET_PRIORITY_LABELS[priority]} ${DEFAULT_DEPARTMENT_DUE_HOURS[DUE_HOURS_FIELD_BY_PRIORITY[priority]]}h`,
).join(", ")

export const DUE_HOURS_DEFAULT_DESCRIPTION = `Este setor ainda usa o padrão do sistema: ${defaultHoursSummary}. Salve para definir prazos próprios.`

const dueHoursFieldCopy = (priority: TicketPriority): DueHoursFieldCopy => ({
  label: TICKET_PRIORITY_LABELS[priority],
  description: `Prazo de horas corridas para chamados de prioridade ${TICKET_PRIORITY_LABELS[priority]}.`,
  unit: "h",
})

export const DUE_HOURS_FIELD_COPY = {
  criticaHours: dueHoursFieldCopy("critica"),
  altaHours: dueHoursFieldCopy("alta"),
  mediaHours: dueHoursFieldCopy("media"),
  baixaHours: dueHoursFieldCopy("baixa"),
} satisfies Record<DueHoursField, DueHoursFieldCopy>

export const SAVE_DUE_HOURS_LABEL = "Salvar prazos"

export const SAVE_DUE_HOURS_PENDING_LABEL = "Salvando…"

export const DUE_HOURS_SAVED_MESSAGE = "Prazos salvos."

export const DUE_HOURS_FORBIDDEN_MESSAGE =
  "Você não tem permissão para editar os prazos deste setor."

export const DUE_HOURS_NOT_FOUND_MESSAGE = "Setor não encontrado."

export const DUE_HOURS_SAVE_FAILED_MESSAGE =
  "Não foi possível salvar os prazos agora. Tente novamente."
