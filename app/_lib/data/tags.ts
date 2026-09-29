import { and, eq, sql } from "drizzle-orm"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import { checkTagDepartment } from "@/app/_lib/domain/tag"
import type {
  InsertTagOutcome,
  TagListItem,
  TagListScope,
  UpdateTagActiveOutcome,
  UpdateTagNameOutcome,
} from "@/app/_lib/types/tag"
import { db } from "@/db"
import { department, tag, ticketTag } from "@/db/schema"

const TAG_NAME_PER_DEPARTMENT_CONSTRAINT = "tag_name_per_department_idx"

interface ExistingTag {
  isActive: boolean
}

async function findExistingTagByName(
  departmentId: number,
  name: string,
): Promise<ExistingTag | null> {
  const [row] = await db
    .select({ isActive: tag.isActive })
    .from(tag)
    .where(
      and(
        eq(tag.departmentId, departmentId),
        sql`lower(${tag.name}) = lower(${name})`,
      ),
    )
    .limit(1)

  return row ?? null
}

export async function listTags(scope: TagListScope): Promise<TagListItem[]> {
  return db
    .select({
      id: tag.id,
      name: tag.name,
      departmentId: tag.departmentId,
      departmentName: department.name,
      departmentIsActive: department.isActive,
      isActive: tag.isActive,
      ticketCount: db.$count(ticketTag, eq(ticketTag.tagId, tag.id)),
      createdAt: tag.createdAt,
    })
    .from(tag)
    .innerJoin(department, eq(tag.departmentId, department.id))
    .where(
      scope.kind === "department"
        ? eq(tag.departmentId, scope.departmentId)
        : undefined,
    )
    .orderBy(
      sql`${department.isBoard} desc`,
      sql`lower(${department.name})`,
      sql`lower(${tag.name})`,
      tag.id,
    )
}

export async function insertTag(
  departmentId: number,
  name: string,
): Promise<InsertTagOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const [departmentRow] = await tx
        .select({
          isActive: department.isActive,
          isUnassigned: department.isUnassigned,
        })
        .from(department)
        .where(eq(department.id, departmentId))
        .for("share")

      if (!departmentRow) {
        return { status: "department_not_found" }
      }

      const block = checkTagDepartment(departmentRow)
      if (block) {
        return { status: block }
      }

      const [row] = await tx
        .insert(tag)
        .values({ departmentId, name })
        .returning({ id: tag.id })

      return { status: "saved", id: row.id }
    })
  } catch (error) {
    if (isUniqueViolation(error, TAG_NAME_PER_DEPARTMENT_CONSTRAINT)) {
      const existing = await findExistingTagByName(departmentId, name)
      if (!existing) {
        throw new Error(
          `Tag "${name}" não encontrada após violação de unicidade no setor ${departmentId}.`,
        )
      }
      return { status: "name_taken", existingIsActive: existing.isActive }
    }
    throw error
  }
}

export async function updateTagName(
  id: number,
  name: string,
): Promise<UpdateTagNameOutcome> {
  try {
    const [row] = await db
      .update(tag)
      .set({ name, updatedAt: new Date() })
      .where(eq(tag.id, id))
      .returning({ id: tag.id })

    if (!row) {
      return { status: "not_found" }
    }

    return { status: "saved", id: row.id }
  } catch (error) {
    if (isUniqueViolation(error, TAG_NAME_PER_DEPARTMENT_CONSTRAINT)) {
      const tagDepartmentId = await findTagDepartment(id)
      if (tagDepartmentId === null) {
        throw new Error(`Tag ${id} não encontrada ao tratar conflito de nome.`)
      }

      const existing = await findExistingTagByName(tagDepartmentId, name)
      if (!existing) {
        throw new Error(
          `Tag "${name}" não encontrada após violação de unicidade no setor ${tagDepartmentId}.`,
        )
      }
      return { status: "name_taken", existingIsActive: existing.isActive }
    }
    throw error
  }
}

export async function updateTagActive(
  id: number,
  isActive: boolean,
): Promise<UpdateTagActiveOutcome> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ departmentId: tag.departmentId })
      .from(tag)
      .where(eq(tag.id, id))
      .for("update")

    if (!current) {
      return { status: "not_found" }
    }

    if (!isActive) {
      await tx
        .update(tag)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tag.id, id))

      return { status: "saved", id }
    }

    const [departmentRow] = await tx
      .select({
        isActive: department.isActive,
        isUnassigned: department.isUnassigned,
      })
      .from(department)
      .where(eq(department.id, current.departmentId))
      .for("share")

    if (!departmentRow) {
      throw new Error(
        `Setor ${current.departmentId} não encontrado para a tag ${id}.`,
      )
    }

    const block = checkTagDepartment(departmentRow)
    if (block) {
      return { status: block }
    }

    await tx
      .update(tag)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(tag.id, id))

    return { status: "saved", id }
  })
}

export async function findTagDepartment(id: number): Promise<number | null> {
  const [row] = await db
    .select({ departmentId: tag.departmentId })
    .from(tag)
    .where(eq(tag.id, id))
    .limit(1)

  return row?.departmentId ?? null
}
