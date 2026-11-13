import {
  navBadgeDepartmentIdFor,
  navBadgeFor,
} from "@/app/_lib/domain/nav-badge"
import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import type { MyTicketsEmptyCopy } from "@/app/_lib/types/my-tickets"
import type { NavBadge } from "@/app/_lib/types/nav-badge"
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

export const approvalsDepartmentIdFor = navBadgeDepartmentIdFor

export const approvalsNavBadgeFor = (count: number): NavBadge | null =>
  navBadgeFor(count, `${APPROVALS_LABEL}, ${count} aguardando`)
