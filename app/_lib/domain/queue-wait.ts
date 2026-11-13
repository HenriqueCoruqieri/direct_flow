import type { QueueWaitReason } from "@/app/_lib/types/queue-wait"
import type { TicketAssigneeTarget } from "@/app/_lib/types/ticket-assignment"

export const OPENING_QUEUE_WAIT_REASON =
  "abertura" as const satisfies QueueWaitReason

export const RECEIVED_QUEUE_WAIT_REASON =
  "transferencia_recebida" as const satisfies QueueWaitReason

export const DECLINED_QUEUE_WAIT_REASON =
  "devolucao_por_recusa" as const satisfies QueueWaitReason

export const opensQueueWaitAtCreation = (
  target: TicketAssigneeTarget,
): boolean => target === "queue"
