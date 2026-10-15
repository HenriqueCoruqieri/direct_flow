import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import type {
  ApprovalsAccessFacts,
  ApprovalsNavBadge,
} from "@/app/_lib/types/approvals"
import type { MyTicketsEmptyCopy } from "@/app/_lib/types/my-tickets"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"

export const APPROVALS_PATH = "/approvals"

export const APPROVALS_LABEL = "Aprovações"

export const APPROVALS_PERIOD_PRESETS = ALL_TIME_PERIOD_PRESETS

export const DEFAULT_APPROVALS_PERIOD: PeriodFilterSelection = {
  periodo: "todos",
}

export const APPROVALS_EMPTY: MyTicketsEmptyCopy = {
  title: "Nenhum chamado aguardando aprovação",
  description:
    "Nenhum chamado foi encaminhado para este setor no período informado",
}

export const APPROVALS_FROM_DEPARTMENT_LABEL = "Veio de"

export const APPROVALS_SENT_AT_LABEL = "Enviado em"

export const APPROVALS_BADGE_MAX = 99

export const approvalsDepartmentIdFor = (
  facts: ApprovalsAccessFacts | null,
): number | null =>
  facts === null || facts.isUnassigned ? null : facts.departmentId

export const formatApprovalsBadgeCount = (count: number): string =>
  count > APPROVALS_BADGE_MAX ? `${APPROVALS_BADGE_MAX}+` : String(count)

export const approvalsNavBadgeFor = (
  count: number,
): ApprovalsNavBadge | null =>
  count > 0
    ? {
        text: formatApprovalsBadgeCount(count),
        accessibleLabel: `${APPROVALS_LABEL}, ${count} aguardando`,
      }
    : null
