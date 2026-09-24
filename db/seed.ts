import "dotenv/config"

import { hashPassword } from "better-auth/crypto"
import { and, eq, sql } from "drizzle-orm"

import {
  addDaysToKey,
  addMonthsToKey,
  resolvePeriodRange,
  toDateKey,
  todayKey,
  zonedDateTime,
} from "@/app/_lib/date"
import type { DateKey, DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { account } from "@/db/auth-schema"
import type {
  NewTicket,
  NewTicketHistory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/db/schema"
import {
  department,
  tag,
  ticket,
  ticketHistory,
  ticketTag,
  user,
} from "@/db/schema"

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Seed abortado: variável de ambiente ${name} não definida.`)
  }
  return value
}

interface SeedAdminResult {
  adminId: number
  departmentId: number
}

async function seedAdmin(): Promise<SeedAdminResult> {
  const departmentName = requiredEnv("SEED_DEPARTMENT_NAME")
  const adminName = requiredEnv("SEED_ADMIN_NAME")
  const adminEmail = requiredEnv("SEED_ADMIN_EMAIL")
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD")

  const [existingAdmin] = await db
    .select({ id: user.id, departmentId: user.departmentId })
    .from(user)
    .where(sql`lower(${user.email}) = lower(${adminEmail})`)
    .limit(1)

  if (existingAdmin) {
    console.log(
      `Seed ignorado: já existe um usuário com o e-mail ${adminEmail}.`,
    )
    return {
      adminId: existingAdmin.id,
      departmentId: existingAdmin.departmentId,
    }
  }

  return db.transaction(async (tx) => {
    const [existingDepartment] = await tx
      .select({ id: department.id })
      .from(department)
      .where(sql`lower(${department.name}) = lower(${departmentName})`)
      .limit(1)

    const departmentId =
      existingDepartment?.id ??
      (
        await tx
          .insert(department)
          .values({ name: departmentName })
          .returning({ id: department.id })
      )[0].id

    const [createdAdmin] = await tx
      .insert(user)
      .values({
        name: adminName,
        email: adminEmail,
        role: "admin",
        departmentId,
        isActive: true,
        emailVerified: true,
      })
      .returning({ id: user.id })

    const passwordHash = await hashPassword(adminPassword)
    const now = new Date()

    await tx.insert(account).values({
      accountId: String(createdAdmin.id),
      providerId: "credential",
      userId: createdAdmin.id,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })

    console.log(
      `Seed concluído: setor "${departmentName}" (id ${departmentId}) e admin "${adminEmail}" (id ${createdAdmin.id}) criados.`,
    )

    return { adminId: createdAdmin.id, departmentId }
  })
}

const DEMO_TAG_NAMES = ["Acesso", "Rede", "Impressora", "Sistema"] as const
type DemoTagName = (typeof DEMO_TAG_NAMES)[number]

const TAG_TITLES: Record<DemoTagName | "geral", string> = {
  Acesso: "Acesso ao sistema bloqueado",
  Rede: "Instabilidade na rede do setor",
  Impressora: "Impressora sem responder",
  Sistema: "Erro ao salvar registro no sistema",
  geral: "Chamado de demonstração",
}

const TICKET_TYPES: TicketType[] = [
  "duvida",
  "ocorrencia",
  "solicitacao",
  "sugestao_de_melhoria",
  "incidente",
  "bug",
]

const PRIORITIES: TicketPriority[] = ["baixa", "media", "alta", "critica"]

const STATUS_CYCLE: TicketStatus[] = [
  "aberto",
  "em_analise",
  "em_andamento",
  "resolvido",
  "fechado",
  "cancelado",
]

const FINAL_STATUSES = new Set<TicketStatus>(["resolvido", "fechado"])

const HOUR_MS = 60 * 60 * 1000

interface DemoTicketBlueprint {
  createdAt: Date
  tagName: DemoTagName | null
}

interface DemoSlot {
  hour: number
  minute: number
  tagName: DemoTagName | null
}

const buildBlueprint = (
  dayKey: DateKey,
  hour: number,
  minute: number,
  tagName: DemoTagName | null,
): DemoTicketBlueprint => ({
  createdAt: zonedDateTime(dayKey, hour, minute),
  tagName,
})

function daysBetweenKeys(startKey: DateKey, endKey: DateKey): DateKey[] {
  const days: DateKey[] = []
  let cursor = startKey
  while (cursor <= endKey) {
    days.push(cursor)
    cursor = addDaysToKey(cursor, 1)
  }
  return days
}

function buildTodayBlueprints(
  today: DateKey,
  now: Date,
): DemoTicketBlueprint[] {
  const safeFirst: DemoTicketBlueprint = {
    createdAt: new Date(
      Math.min(zonedDateTime(today, 0, 1).getTime(), now.getTime()),
    ),
    tagName: "Acesso",
  }

  const slots: DemoSlot[] = [
    { hour: 7, minute: 10, tagName: "Acesso" },
    { hour: 9, minute: 40, tagName: "Acesso" },
    { hour: 11, minute: 5, tagName: "Acesso" },
    { hour: 13, minute: 20, tagName: "Rede" },
    { hour: 15, minute: 50, tagName: "Sistema" },
    { hour: 18, minute: 30, tagName: null },
  ]

  const rest = slots
    .map((slot) => buildBlueprint(today, slot.hour, slot.minute, slot.tagName))
    .filter((blueprint) => blueprint.createdAt.getTime() <= now.getTime())

  return [safeFirst, ...rest]
}

function buildYesterdayLateBlueprints(today: DateKey): DemoTicketBlueprint[] {
  const yesterday = addDaysToKey(today, -1)
  return [
    buildBlueprint(yesterday, 21, 15, "Rede"),
    buildBlueprint(yesterday, 22, 5, "Rede"),
    buildBlueprint(yesterday, 22, 50, "Acesso"),
    buildBlueprint(yesterday, 23, 59, "Impressora"),
  ]
}

function buildWeekBeforeYesterdayBlueprints(
  today: DateKey,
  weekStart: DateKey,
): DemoTicketBlueprint[] {
  const anteontem = addDaysToKey(today, -2)
  const days = daysBetweenKeys(weekStart, anteontem)
  if (days.length === 0) return []

  const pattern: DemoSlot[] = [
    { hour: 10, minute: 0, tagName: "Sistema" },
    { hour: 21, minute: 30, tagName: "Sistema" },
    { hour: 14, minute: 15, tagName: "Acesso" },
    { hour: 22, minute: 40, tagName: "Rede" },
    { hour: 9, minute: 5, tagName: "Impressora" },
    { hour: 23, minute: 10, tagName: null },
  ]

  return pattern.map((slot, index) =>
    buildBlueprint(
      days[index % days.length],
      slot.hour,
      slot.minute,
      slot.tagName,
    ),
  )
}

function buildMonthBeforeWeekBlueprints(
  weekStart: DateKey,
  monthStart: DateKey,
): DemoTicketBlueprint[] {
  const beforeWeek = addDaysToKey(weekStart, -1)
  const days = daysBetweenKeys(monthStart, beforeWeek)
  if (days.length === 0) return []

  const pattern: DemoSlot[] = [
    { hour: 8, minute: 30, tagName: "Impressora" },
    { hour: 11, minute: 45, tagName: "Sistema" },
    { hour: 13, minute: 0, tagName: "Sistema" },
    { hour: 15, minute: 20, tagName: "Rede" },
    { hour: 17, minute: 10, tagName: "Acesso" },
    { hour: 19, minute: 50, tagName: null },
    { hour: 10, minute: 5, tagName: "Impressora" },
  ]

  return pattern.map((slot, index) =>
    buildBlueprint(
      days[index % days.length],
      slot.hour,
      slot.minute,
      slot.tagName,
    ),
  )
}

function buildPreviousMonthBlueprints(
  monthStart: DateKey,
): DemoTicketBlueprint[] {
  const prevMonthStart = addMonthsToKey(monthStart, -1)
  const prevMonthEnd = addDaysToKey(monthStart, -1)
  const days = daysBetweenKeys(prevMonthStart, prevMonthEnd)

  const pick = (fraction: number): DateKey =>
    days[Math.min(days.length - 1, Math.floor((days.length - 1) * fraction))]

  return [
    buildBlueprint(pick(0.05), 9, 15, "Acesso"),
    buildBlueprint(pick(0.2), 10, 30, "Acesso"),
    buildBlueprint(pick(0.35), 14, 0, "Acesso"),
    buildBlueprint(pick(0.5), 11, 20, "Impressora"),
    buildBlueprint(pick(0.65), 13, 40, "Impressora"),
    buildBlueprint(pick(0.8), 16, 10, "Impressora"),
    buildBlueprint(prevMonthEnd, 22, 0, null),
  ]
}

function buildFillerBlueprints(
  today: DateKey,
  count: number,
): DemoTicketBlueprint[] {
  const yesterday = addDaysToKey(today, -1)
  return Array.from({ length: count }, (_, index) =>
    buildBlueprint(
      yesterday,
      8 + (index % 10),
      (index * 7) % 60,
      DEMO_TAG_NAMES[index % DEMO_TAG_NAMES.length],
    ),
  )
}

async function ensureDemoTags(
  tx: Transaction,
  departmentId: number,
): Promise<Map<DemoTagName, number>> {
  const ids = new Map<DemoTagName, number>()

  for (const name of DEMO_TAG_NAMES) {
    const [existing] = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(
        and(
          eq(tag.departmentId, departmentId),
          eq(tag.isActive, true),
          sql`lower(${tag.name}) = lower(${name})`,
        ),
      )
      .limit(1)

    if (existing) {
      ids.set(name, existing.id)
      continue
    }

    const [created] = await tx
      .insert(tag)
      .values({ name, departmentId })
      .returning({ id: tag.id })

    ids.set(name, created.id)
  }

  return ids
}

interface Gabarito {
  count: number
  topTag: { name: string; count: number } | null
}

function computeGabarito(
  blueprints: DemoTicketBlueprint[],
  range: DateRange,
): Gabarito {
  const inRange = blueprints.filter(
    (blueprint) =>
      blueprint.createdAt.getTime() >= range.start.getTime() &&
      blueprint.createdAt.getTime() < range.end.getTime(),
  )

  const tagCounts = new Map<string, number>()
  for (const blueprint of inRange) {
    if (!blueprint.tagName) continue
    tagCounts.set(
      blueprint.tagName,
      (tagCounts.get(blueprint.tagName) ?? 0) + 1,
    )
  }

  const sortedTags = [...tagCounts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  })

  const topTag = sortedTags[0]
    ? { name: sortedTags[0][0], count: sortedTags[0][1] }
    : null

  return { count: inRange.length, topTag }
}

function formatGabarito(label: string, gabarito: Gabarito): string {
  const tagLabel = gabarito.topTag
    ? `${gabarito.topTag.name} (${gabarito.topTag.count})`
    : "—"
  return `  ${label} -> chamados: ${gabarito.count}, tag ofensora: ${tagLabel}`
}

async function seedDemo(admin: SeedAdminResult): Promise<void> {
  if (process.env.SEED_DEMO !== "true") return

  const [existingTicket] = await db
    .select({ id: ticket.id })
    .from(ticket)
    .where(eq(ticket.currentDepartmentId, admin.departmentId))
    .limit(1)

  if (existingTicket) {
    console.log("Seed demo ignorado: o setor do admin já possui chamados.")
    return
  }

  await db.transaction(async (tx) => {
    const tagIds = await ensureDemoTags(tx, admin.departmentId)

    const now = new Date()
    const today = todayKey(now)
    const weekStart = toDateKey(
      resolvePeriodRange({ periodo: "semana" }, now).start,
    )
    const monthStart = toDateKey(
      resolvePeriodRange({ periodo: "mes" }, now).start,
    )

    const todayBlueprints = buildTodayBlueprints(today, now)
    const yesterdayLateBlueprints = buildYesterdayLateBlueprints(today)
    const weekBeforeYesterdayBlueprints = buildWeekBeforeYesterdayBlueprints(
      today,
      weekStart,
    )
    const monthBeforeWeekBlueprints = buildMonthBeforeWeekBlueprints(
      weekStart,
      monthStart,
    )
    const previousMonthBlueprints = buildPreviousMonthBlueprints(monthStart)

    const fillerNeeded =
      (weekBeforeYesterdayBlueprints.length === 0 ? 6 : 0) +
      (monthBeforeWeekBlueprints.length === 0 ? 7 : 0)

    const fillerBlueprints =
      fillerNeeded > 0 ? buildFillerBlueprints(today, fillerNeeded) : []

    const blueprints = [
      ...todayBlueprints,
      ...yesterdayLateBlueprints,
      ...weekBeforeYesterdayBlueprints,
      ...monthBeforeWeekBlueprints,
      ...previousMonthBlueprints,
      ...fillerBlueprints,
    ]

    for (const [index, blueprint] of blueprints.entries()) {
      const type = TICKET_TYPES[index % TICKET_TYPES.length]
      const priority = PRIORITIES[index % PRIORITIES.length]
      const status = STATUS_CYCLE[index % STATUS_CYCLE.length]
      const initialStatus: TicketStatus = FINAL_STATUSES.has(status)
        ? "aberto"
        : status

      let resolvedAt: Date | null = null
      let closedAt: Date | null = null

      if (status === "resolvido" || status === "fechado") {
        resolvedAt = new Date(
          Math.min(blueprint.createdAt.getTime() + 2 * HOUR_MS, now.getTime()),
        )
      }
      if (status === "fechado") {
        closedAt = new Date(
          Math.min(blueprint.createdAt.getTime() + 4 * HOUR_MS, now.getTime()),
        )
      }

      const updatedAt = new Date(
        Math.max(
          blueprint.createdAt.getTime(),
          resolvedAt?.getTime() ?? 0,
          closedAt?.getTime() ?? 0,
        ),
      )

      const ticketValues: NewTicket = {
        title: `${TAG_TITLES[blueprint.tagName ?? "geral"]} #${index + 1}`,
        description:
          "Chamado de demonstração gerado pelo seed para validar o dashboard do setor.",
        type,
        status,
        priority,
        createdBy: admin.adminId,
        originDepartmentId: admin.departmentId,
        currentDepartmentId: admin.departmentId,
        createdAt: blueprint.createdAt,
        updatedAt,
        resolvedAt,
        closedAt,
      }

      const [createdTicket] = await tx
        .insert(ticket)
        .values(ticketValues)
        .returning({ id: ticket.id })

      const historyRows: NewTicketHistory[] = [
        {
          ticketId: createdTicket.id,
          changedBy: admin.adminId,
          event: "criacao",
          toStatus: initialStatus,
          changedAt: blueprint.createdAt,
        },
      ]

      if (status === "resolvido" || status === "fechado") {
        historyRows.push({
          ticketId: createdTicket.id,
          changedBy: admin.adminId,
          event: "mudanca_status",
          fromStatus: "aberto",
          toStatus: status,
          changedAt:
            status === "fechado"
              ? (closedAt ?? blueprint.createdAt)
              : (resolvedAt ?? blueprint.createdAt),
        })
      }

      await tx.insert(ticketHistory).values(historyRows)

      if (blueprint.tagName) {
        const tagId = tagIds.get(blueprint.tagName)
        if (tagId === undefined) {
          throw new Error(
            `Seed demo: tag "${blueprint.tagName}" não foi criada nem encontrada.`,
          )
        }

        await tx.insert(ticketTag).values({
          ticketId: createdTicket.id,
          tagId,
          createdAt: blueprint.createdAt,
        })
      }
    }

    const hojeGabarito = computeGabarito(
      blueprints,
      resolvePeriodRange({ periodo: "hoje" }, now),
    )
    const semanaGabarito = computeGabarito(
      blueprints,
      resolvePeriodRange({ periodo: "semana" }, now),
    )
    const mesGabarito = computeGabarito(
      blueprints,
      resolvePeriodRange({ periodo: "mes" }, now),
    )

    console.log(
      `Seed demo concluído: ${blueprints.length} chamados criados no setor ${admin.departmentId}.`,
    )
    console.log("Gabarito calculado em JS sobre as datas geradas:")
    console.log(formatGabarito("hoje  ", hojeGabarito))
    console.log(formatGabarito("semana", semanaGabarito))
    console.log(formatGabarito("mes   ", mesGabarito))
  })
}

async function seed() {
  try {
    const admin = await seedAdmin()
    await seedDemo(admin)
  } finally {
    await db.$client.end()
  }
}

seed().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
