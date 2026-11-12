import { formatDateAtTime } from "@/app/_lib/date"
import type { ChangeStamp } from "@/app/_lib/types/registry"

export const EMPTY_VALUE_LABEL = "—"

export const lastChangeLabel = (stamp: ChangeStamp): string =>
  stamp.updatedByName === null
    ? `Última alteração em ${formatDateAtTime(stamp.updatedAt)}.`
    : `Última alteração por ${stamp.updatedByName} em ${formatDateAtTime(stamp.updatedAt)}.`
