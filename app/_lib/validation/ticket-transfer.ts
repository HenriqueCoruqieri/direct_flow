import { z } from "zod"

import { registryIdSchema } from "@/app/_lib/validation/registry"
import { POSTGRES_INTEGER_MAX } from "@/app/_lib/validation/search-params"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

const SELECT_TARGET_DEPARTMENT_MESSAGE = "Selecione o setor de destino."

const STALE_DEPARTMENT_MESSAGE =
  "Não foi possível conferir o setor atual do chamado. Recarregue a página."

const toDepartmentIdSchema = registryIdSchema(
  SELECT_TARGET_DEPARTMENT_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: SELECT_TARGET_DEPARTMENT_MESSAGE })

const expectedDepartmentIdSchema = registryIdSchema(
  STALE_DEPARTMENT_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: STALE_DEPARTMENT_MESSAGE })

export const sendTicketToDepartmentSchema = z
  .object({
    ticketId: ticketIdSchema,
    toDepartmentId: toDepartmentIdSchema,
    expectedDepartmentId: expectedDepartmentIdSchema,
  })
  .refine((data) => data.toDepartmentId !== data.expectedDepartmentId, {
    error: "Escolha um setor diferente do atual.",
    path: ["toDepartmentId"],
  })

export type SendTicketToDepartmentInput = z.infer<
  typeof sendTicketToDepartmentSchema
>
