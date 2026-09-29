import { z } from "zod"

import {
  REGISTRY_NAME_MAX_LENGTH,
  REGISTRY_NAME_MIN_LENGTH,
} from "@/app/_lib/domain/registry"

export const registryNameSchema = (requiredMessage: string) =>
  z
    .string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage })
    .min(REGISTRY_NAME_MIN_LENGTH, {
      error: `O nome precisa ter no mínimo ${REGISTRY_NAME_MIN_LENGTH} caracteres.`,
    })
    .max(REGISTRY_NAME_MAX_LENGTH, {
      error: `O nome precisa ter no máximo ${REGISTRY_NAME_MAX_LENGTH} caracteres.`,
    })

export const registryIdSchema = (message: string) =>
  z
    .number({ error: message })
    .int({ error: message })
    .positive({ error: message })

export const registryActiveSchema = z.boolean({ error: "Situação inválida." })
