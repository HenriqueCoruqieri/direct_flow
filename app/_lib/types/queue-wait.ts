import type { QueueWaitReason } from "@/db/schema"

export type { QueueWaitReason }

export interface OpenQueueWaitValues {
  ticketId: number
  departmentId: number
  reason: QueueWaitReason
  startedAt: Date
}
