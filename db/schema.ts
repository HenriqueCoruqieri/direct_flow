import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}

const pk = () => integer("id").primaryKey().generatedAlwaysAsIdentity()

export const roleEnum = pgEnum("role", ["admin", "member"])

export const ticketTypeEnum = pgEnum("ticket_type", [
  "duvida",
  "ocorrencia",
  "solicitacao",
  "sugestao_de_melhoria",
  "incidente",
  "bug",
])

export const ticketStatusEnum = pgEnum("ticket_status", [
  "aberto",
  "em_analise",
  "encaminhado",
  "recusado",
  "aguardando_aprovacao",
  "em_andamento",
  "resolvido",
  "fechado",
  "cancelado",
])

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "baixa",
  "media",
  "alta",
  "critica",
])

export const approvalStatusEnum = pgEnum("approval_status", [
  "pendente",
  "aprovado",
  "cancelado",
  "rejeitado",
])

export const historyEventEnum = pgEnum("history_event", [
  "criacao",
  "mudanca_status",
  "mudanca_prioridade",
  "atribuicao",
  "transferencia_solicitada",
  "transferencia_aprovada",
  "transferencia_rejeitada",
  "reabertura",
  "encerramento",
  "mudanca_tag",
  "edicao",
  "resolucao",
  "mudanca_empresa",
])

export const messageVisibilityEnum = pgEnum("message_visibility", [
  "publica",
  "interna",
])

export const messageHistoryEventEnum = pgEnum("message_history_event", [
  "criacao",
  "edicao",
  "exclusao",
])

export const attachmentHistoryEventEnum = pgEnum("attachment_history_event", [
  "inclusao",
  "exclusao",
])

export const brazilianStateEnum = pgEnum("brazilian_state", [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
])

export const companyContactPositionEnum = pgEnum("company_contact_position", [
  "primary",
  "secondary",
])

export const queueWaitReasonEnum = pgEnum("queue_wait_reason", [
  "abertura",
  "transferencia_recebida",
  "devolucao_por_recusa",
])

export const department = pgTable(
  "department",
  {
    id: pk(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isBoard: boolean("is_board").default(false).notNull(),
    isUnassigned: boolean("is_unassigned").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("department_name_lower_idx").on(sql`lower(${table.name})`),
    uniqueIndex("department_single_board_idx")
      .on(table.isBoard)
      .where(sql`is_board`),
    check("department_board_active", sql`not is_board or is_active`),
    uniqueIndex("department_single_unassigned_idx")
      .on(table.isUnassigned)
      .where(sql`is_unassigned`),
    check("department_unassigned_active", sql`not is_unassigned or is_active`),
    check(
      "department_board_not_unassigned",
      sql`not (is_board and is_unassigned)`,
    ),
  ],
)

export const user = pgTable(
  "users",
  {
    id: pk(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: roleEnum("role").default("member").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    mustChangePassword: boolean("must_change_password")
      .default(false)
      .notNull(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_email_lower_idx").on(sql`lower(${table.email})`),
    index("user_department_idx").on(table.departmentId),
    index("user_department_role_idx")
      .on(table.departmentId, table.role)
      .where(sql`is_active`),
  ],
)

export const tag = pgTable(
  "tag",
  {
    id: pk(),
    name: text("name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    priority: ticketPriorityEnum("priority"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tag_name_per_department_idx").on(
      table.departmentId,
      sql`lower(${table.name})`,
    ),
    index("tag_department_idx").on(table.departmentId),
  ],
)

export const ticket = pgTable(
  "ticket",
  {
    id: pk(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: ticketTypeEnum("type").notNull(),
    status: ticketStatusEnum("status").default("aberto").notNull(),
    priority: ticketPriorityEnum("priority").default("media").notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    assignedTo: integer("assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    originDepartmentId: integer("origin_department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    currentDepartmentId: integer("current_department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    solution: text("solution"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    companyId: integer("company_id").references(() => company.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (table) => [
    index("ticket_dept_status_idx").on(
      table.currentDepartmentId,
      table.status,
      table.createdAt.desc(),
    ),
    index("ticket_created_by_idx").on(table.createdBy),
    index("ticket_assigned_to_idx").on(table.assignedTo),
    index("ticket_origin_department_idx").on(table.originDepartmentId),
    index("ticket_company_idx").on(table.companyId),
    index("ticket_dept_due_idx").on(table.currentDepartmentId, table.dueAt),
    check(
      "ticket_title_length",
      sql`char_length(${table.title}) between 3 and 200`,
    ),
  ],
)

export const ticketTag = pgTable(
  "ticket_tag",
  {
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "restrict" }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.tagId] }),
    uniqueIndex("ticket_tag_single_per_ticket_idx").on(table.ticketId),
    index("ticket_tag_tag_idx").on(table.tagId),
  ],
)

export const ticketTransfer = pgTable(
  "ticket_transfer",
  {
    id: pk(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    fromDepartmentId: integer("from_department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    toDepartmentId: integer("to_department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    toUserId: integer("to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    requestedBy: integer("requested_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    requestReason: text("request_reason"),
    status: approvalStatusEnum("status").default("pendente").notNull(),
    reviewedBy: integer("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    fromDueAt: timestamp("from_due_at", { withTimezone: true }),
    fromAssigneeId: integer("from_assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("transfer_inbox_idx").on(
      table.toDepartmentId,
      table.status,
      table.createdAt.desc(),
    ),
    index("transfer_ticket_idx").on(table.ticketId, table.createdAt.desc()),
    index("transfer_from_department_idx").on(table.fromDepartmentId),
    index("transfer_from_assignee_idx").on(table.fromAssigneeId),
    index("transfer_to_user_idx").on(table.toUserId),
    index("transfer_requested_by_idx").on(table.requestedBy),
    index("transfer_reviewed_by_idx").on(table.reviewedBy),
    uniqueIndex("transfer_one_pending_per_ticket_idx")
      .on(table.ticketId)
      .where(sql`status = 'pendente'`),
    check(
      "transfer_different_departments",
      sql`${table.fromDepartmentId} <> ${table.toDepartmentId}`,
    ),
  ],
)

export const ticketHistory = pgTable(
  "ticket_history",
  {
    id: pk(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    changedBy: integer("changed_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    event: historyEventEnum("event").notNull(),
    fromStatus: ticketStatusEnum("from_status"),
    toStatus: ticketStatusEnum("to_status"),
    fromPriority: ticketPriorityEnum("from_priority"),
    toPriority: ticketPriorityEnum("to_priority"),
    fromDepartmentId: integer("from_department_id").references(
      () => department.id,
      { onDelete: "restrict" },
    ),
    toDepartmentId: integer("to_department_id").references(
      () => department.id,
      { onDelete: "restrict" },
    ),
    fromAssigneeId: integer("from_assignee_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    toAssigneeId: integer("to_assignee_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    fromTagId: integer("from_tag_id").references(() => tag.id, {
      onDelete: "restrict",
    }),
    toTagId: integer("to_tag_id").references(() => tag.id, {
      onDelete: "restrict",
    }),
    fromCompanyId: integer("from_company_id").references(() => company.id, {
      onDelete: "restrict",
    }),
    toCompanyId: integer("to_company_id").references(() => company.id, {
      onDelete: "restrict",
    }),
    toDueAt: timestamp("to_due_at", { withTimezone: true }),
    note: text("note"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("history_ticket_idx").on(table.ticketId, table.changedAt.desc()),
    index("history_changed_by_idx").on(table.changedBy),
    index("history_to_department_idx").on(table.toDepartmentId),
    index("history_to_assignee_idx").on(table.toAssigneeId),
    index("history_to_tag_idx").on(table.toTagId),
    index("history_to_company_idx").on(table.toCompanyId),
  ],
)

export const message = pgTable(
  "message",
  {
    id: pk(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    visibility: messageVisibilityEnum("visibility")
      .default("publica")
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("message_ticket_idx").on(table.ticketId, table.createdAt.desc()),
    index("message_user_idx").on(table.userId),
    unique("message_id_ticket_key").on(table.id, table.ticketId),
  ],
)

export const messageHistory = pgTable(
  "message_history",
  {
    id: pk(),
    messageId: integer("message_id").notNull(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    actorId: integer("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    event: messageHistoryEventEnum("event").notNull(),
    content: text("content").notNull(),
    visibility: messageVisibilityEnum("visibility").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("message_history_message_idx").on(table.messageId, table.changedAt),
    index("message_history_ticket_idx").on(table.ticketId),
    index("message_history_actor_idx").on(table.actorId),
  ],
)

export const attachment = pgTable(
  "attachment",
  {
    id: pk(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    messageId: integer("message_id"),
    uploadedBy: integer("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("attachment_ticket_idx").on(table.ticketId),
    index("attachment_message_idx").on(table.messageId, table.ticketId),
    index("attachment_uploaded_by_idx").on(table.uploadedBy),
    uniqueIndex("attachment_storage_key_idx").on(table.storageKey),
    check("attachment_size_positive", sql`${table.sizeBytes} > 0`),
    foreignKey({
      columns: [table.messageId, table.ticketId],
      foreignColumns: [message.id, message.ticketId],
      name: "attachment_message_ticket_fk",
    }).onDelete("cascade"),
  ],
)

export const attachmentHistory = pgTable(
  "attachment_history",
  {
    id: pk(),
    attachmentId: integer("attachment_id").notNull(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    actorId: integer("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    event: attachmentHistoryEventEnum("event").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("attachment_history_attachment_idx").on(
      table.attachmentId,
      table.changedAt,
    ),
    index("attachment_history_ticket_idx").on(table.ticketId),
    index("attachment_history_actor_idx").on(table.actorId),
  ],
)

export const company = pgTable(
  "company",
  {
    id: pk(),
    cnpj: text("cnpj").notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name").notNull(),
    email: text("email").notNull(),
    cep: text("cep").notNull(),
    state: brazilianStateEnum("state").notNull(),
    street: text("street").notNull(),
    number: text("number").notNull(),
    district: text("district").notNull(),
    city: text("city").notNull(),
    complement: text("complement"),
    managerName: text("manager_name").notNull(),
    managerPhone: text("manager_phone").notNull(),
    businessDays: smallint("business_days").array(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("company_cnpj_idx").on(table.cnpj),
    check("company_cnpj_format", sql`cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
    check("company_cep_digits", sql`cep ~ '^[0-9]{8}$'`),
    check(
      "company_manager_phone_digits",
      sql`manager_phone ~ '^[1-9][0-9]{9,10}$'`,
    ),
    check(
      "company_business_hours_complete",
      sql`(business_days is null and opens_at is null and closes_at is null) or (cardinality(business_days) > 0 and opens_at is not null and closes_at is not null)`,
    ),
    check(
      "company_business_hours_order",
      sql`closes_at is null or opens_at is null or closes_at > opens_at`,
    ),
    check(
      "company_business_days_range",
      sql`business_days is null or business_days <@ array[1,2,3,4,5,6,7]::smallint[]`,
    ),
  ],
)

export const companyContact = pgTable(
  "company_contact",
  {
    id: pk(),
    companyId: integer("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    position: companyContactPositionEnum("position").notNull(),
    phone: text("phone").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("company_contact_company_position_idx").on(
      table.companyId,
      table.position,
    ),
    check("company_contact_phone_digits", sql`phone ~ '^[1-9][0-9]{9,10}$'`),
  ],
)

export const departmentGoal = pgTable(
  "department_goal",
  {
    id: pk(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    slaMinPercent: smallint("sla_min_percent").notNull(),
    tmaMaxHours: smallint("tma_max_hours").notNull(),
    overdueHoursLimit: smallint("overdue_hours_limit").notNull(),
    overdueTicketsLimit: integer("overdue_tickets_limit").notNull(),
    tmrMaxHours: smallint("tmr_max_hours"),
    updatedBy: integer("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("department_goal_department_idx").on(table.departmentId),
    index("department_goal_updated_by_idx").on(table.updatedBy),
    check(
      "department_goal_sla_min_percent_range",
      sql`${table.slaMinPercent} between 1 and 100`,
    ),
    check(
      "department_goal_tma_max_hours_positive",
      sql`${table.tmaMaxHours} >= 1`,
    ),
    check(
      "department_goal_overdue_hours_limit_non_negative",
      sql`${table.overdueHoursLimit} >= 0`,
    ),
    check(
      "department_goal_overdue_tickets_limit_non_negative",
      sql`${table.overdueTicketsLimit} >= 0`,
    ),
    check(
      "department_goal_tmr_max_hours_positive",
      sql`${table.tmrMaxHours} >= 1`,
    ),
  ],
)

export const departmentDueHours = pgTable(
  "department_due_hours",
  {
    id: pk(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    criticaHours: smallint("critica_hours").notNull(),
    altaHours: smallint("alta_hours").notNull(),
    mediaHours: smallint("media_hours").notNull(),
    baixaHours: smallint("baixa_hours").notNull(),
    updatedBy: integer("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("department_due_hours_department_idx").on(table.departmentId),
    index("department_due_hours_updated_by_idx").on(table.updatedBy),
    check(
      "department_due_hours_critica_range",
      sql`${table.criticaHours} between 1 and 999`,
    ),
    check(
      "department_due_hours_alta_range",
      sql`${table.altaHours} between 1 and 999`,
    ),
    check(
      "department_due_hours_media_range",
      sql`${table.mediaHours} between 1 and 999`,
    ),
    check(
      "department_due_hours_baixa_range",
      sql`${table.baixaHours} between 1 and 999`,
    ),
  ],
)

export const ticketQueueWait = pgTable(
  "ticket_queue_wait",
  {
    id: pk(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "restrict" }),
    reason: queueWaitReasonEnum("reason").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("queue_wait_ticket_idx").on(table.ticketId, table.startedAt),
    index("queue_wait_department_ended_idx").on(
      table.departmentId,
      table.endedAt,
    ),
    uniqueIndex("queue_wait_one_open_per_ticket_idx")
      .on(table.ticketId)
      .where(sql`ended_at is null`),
    check(
      "queue_wait_ended_after_started",
      sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
    ),
  ],
)

export const departmentRelations = relations(department, ({ one, many }) => ({
  users: many(user),
  tags: many(tag),
  originTickets: many(ticket, { relationName: "ticket_origin_department" }),
  currentTickets: many(ticket, { relationName: "ticket_current_department" }),
  incomingTransfers: many(ticketTransfer, {
    relationName: "transfer_to_department",
  }),
  outgoingTransfers: many(ticketTransfer, {
    relationName: "transfer_from_department",
  }),
  historyFrom: many(ticketHistory, { relationName: "history_from_department" }),
  historyTo: many(ticketHistory, { relationName: "history_to_department" }),
  goal: one(departmentGoal),
  dueHours: one(departmentDueHours),
  queueWaits: many(ticketQueueWait),
}))

export const userRelations = relations(user, ({ one, many }) => ({
  department: one(department, {
    fields: [user.departmentId],
    references: [department.id],
  }),
  createdTickets: many(ticket, { relationName: "ticket_creator" }),
  assignedTickets: many(ticket, { relationName: "ticket_assignee" }),
  receivedTransfers: many(ticketTransfer, {
    relationName: "transfer_to_user",
  }),
  requestedTransfers: many(ticketTransfer, {
    relationName: "transfer_requested_by",
  }),
  reviewedTransfers: many(ticketTransfer, {
    relationName: "transfer_reviewed_by",
  }),
  historyChanges: many(ticketHistory, { relationName: "history_changed_by" }),
  messages: many(message),
  messageHistoryActions: many(messageHistory),
  attachments: many(attachment),
  attachmentHistoryActions: many(attachmentHistory),
  historyFromAssignee: many(ticketHistory, {
    relationName: "history_from_assignee",
  }),
  historyToAssignee: many(ticketHistory, {
    relationName: "history_to_assignee",
  }),
  updatedDepartmentGoals: many(departmentGoal),
  updatedDepartmentDueHours: many(departmentDueHours),
  heldTransfers: many(ticketTransfer, {
    relationName: "transfer_from_assignee",
  }),
}))

export const tagRelations = relations(tag, ({ one, many }) => ({
  department: one(department, {
    fields: [tag.departmentId],
    references: [department.id],
  }),
  ticketTags: many(ticketTag),
  historyFrom: many(ticketHistory, { relationName: "history_from_tag" }),
  historyTo: many(ticketHistory, { relationName: "history_to_tag" }),
}))

export const ticketRelations = relations(ticket, ({ one, many }) => ({
  creator: one(user, {
    fields: [ticket.createdBy],
    references: [user.id],
    relationName: "ticket_creator",
  }),
  assignee: one(user, {
    fields: [ticket.assignedTo],
    references: [user.id],
    relationName: "ticket_assignee",
  }),
  originDepartment: one(department, {
    fields: [ticket.originDepartmentId],
    references: [department.id],
    relationName: "ticket_origin_department",
  }),
  currentDepartment: one(department, {
    fields: [ticket.currentDepartmentId],
    references: [department.id],
    relationName: "ticket_current_department",
  }),
  company: one(company, {
    fields: [ticket.companyId],
    references: [company.id],
  }),
  ticketTags: many(ticketTag),
  transfers: many(ticketTransfer),
  history: many(ticketHistory),
  messages: many(message),
  messageHistory: many(messageHistory),
  attachments: many(attachment),
  attachmentHistory: many(attachmentHistory),
  queueWaits: many(ticketQueueWait),
}))

export const ticketTagRelations = relations(ticketTag, ({ one }) => ({
  ticket: one(ticket, {
    fields: [ticketTag.ticketId],
    references: [ticket.id],
  }),
  tag: one(tag, {
    fields: [ticketTag.tagId],
    references: [tag.id],
  }),
}))

export const ticketTransferRelations = relations(ticketTransfer, ({ one }) => ({
  ticket: one(ticket, {
    fields: [ticketTransfer.ticketId],
    references: [ticket.id],
  }),
  fromDepartment: one(department, {
    fields: [ticketTransfer.fromDepartmentId],
    references: [department.id],
    relationName: "transfer_from_department",
  }),
  toDepartment: one(department, {
    fields: [ticketTransfer.toDepartmentId],
    references: [department.id],
    relationName: "transfer_to_department",
  }),
  recipient: one(user, {
    fields: [ticketTransfer.toUserId],
    references: [user.id],
    relationName: "transfer_to_user",
  }),
  requester: one(user, {
    fields: [ticketTransfer.requestedBy],
    references: [user.id],
    relationName: "transfer_requested_by",
  }),
  reviewer: one(user, {
    fields: [ticketTransfer.reviewedBy],
    references: [user.id],
    relationName: "transfer_reviewed_by",
  }),
  fromAssignee: one(user, {
    fields: [ticketTransfer.fromAssigneeId],
    references: [user.id],
    relationName: "transfer_from_assignee",
  }),
}))

export const ticketHistoryRelations = relations(ticketHistory, ({ one }) => ({
  ticket: one(ticket, {
    fields: [ticketHistory.ticketId],
    references: [ticket.id],
  }),
  changedByUser: one(user, {
    fields: [ticketHistory.changedBy],
    references: [user.id],
    relationName: "history_changed_by",
  }),
  fromDepartment: one(department, {
    fields: [ticketHistory.fromDepartmentId],
    references: [department.id],
    relationName: "history_from_department",
  }),
  toDepartment: one(department, {
    fields: [ticketHistory.toDepartmentId],
    references: [department.id],
    relationName: "history_to_department",
  }),
  fromAssignee: one(user, {
    fields: [ticketHistory.fromAssigneeId],
    references: [user.id],
    relationName: "history_from_assignee",
  }),
  toAssignee: one(user, {
    fields: [ticketHistory.toAssigneeId],
    references: [user.id],
    relationName: "history_to_assignee",
  }),
  fromTag: one(tag, {
    fields: [ticketHistory.fromTagId],
    references: [tag.id],
    relationName: "history_from_tag",
  }),
  toTag: one(tag, {
    fields: [ticketHistory.toTagId],
    references: [tag.id],
    relationName: "history_to_tag",
  }),
  fromCompany: one(company, {
    fields: [ticketHistory.fromCompanyId],
    references: [company.id],
    relationName: "history_from_company",
  }),
  toCompany: one(company, {
    fields: [ticketHistory.toCompanyId],
    references: [company.id],
    relationName: "history_to_company",
  }),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
  ticket: one(ticket, {
    fields: [message.ticketId],
    references: [ticket.id],
  }),
  author: one(user, {
    fields: [message.userId],
    references: [user.id],
  }),
  attachments: many(attachment),
}))

export const messageHistoryRelations = relations(messageHistory, ({ one }) => ({
  ticket: one(ticket, {
    fields: [messageHistory.ticketId],
    references: [ticket.id],
  }),
  actor: one(user, {
    fields: [messageHistory.actorId],
    references: [user.id],
  }),
}))

export const attachmentRelations = relations(attachment, ({ one }) => ({
  ticket: one(ticket, {
    fields: [attachment.ticketId],
    references: [ticket.id],
  }),
  message: one(message, {
    fields: [attachment.messageId],
    references: [message.id],
  }),
  uploader: one(user, {
    fields: [attachment.uploadedBy],
    references: [user.id],
  }),
}))

export const attachmentHistoryRelations = relations(
  attachmentHistory,
  ({ one }) => ({
    ticket: one(ticket, {
      fields: [attachmentHistory.ticketId],
      references: [ticket.id],
    }),
    actor: one(user, {
      fields: [attachmentHistory.actorId],
      references: [user.id],
    }),
  }),
)

export const companyRelations = relations(company, ({ many }) => ({
  contacts: many(companyContact),
  tickets: many(ticket),
  historyFrom: many(ticketHistory, { relationName: "history_from_company" }),
  historyTo: many(ticketHistory, { relationName: "history_to_company" }),
}))

export const companyContactRelations = relations(companyContact, ({ one }) => ({
  company: one(company, {
    fields: [companyContact.companyId],
    references: [company.id],
  }),
}))

export const departmentGoalRelations = relations(departmentGoal, ({ one }) => ({
  department: one(department, {
    fields: [departmentGoal.departmentId],
    references: [department.id],
  }),
  updater: one(user, {
    fields: [departmentGoal.updatedBy],
    references: [user.id],
  }),
}))

export const departmentDueHoursRelations = relations(
  departmentDueHours,
  ({ one }) => ({
    department: one(department, {
      fields: [departmentDueHours.departmentId],
      references: [department.id],
    }),
    updater: one(user, {
      fields: [departmentDueHours.updatedBy],
      references: [user.id],
    }),
  }),
)

export const ticketQueueWaitRelations = relations(
  ticketQueueWait,
  ({ one }) => ({
    ticket: one(ticket, {
      fields: [ticketQueueWait.ticketId],
      references: [ticket.id],
    }),
    department: one(department, {
      fields: [ticketQueueWait.departmentId],
      references: [department.id],
    }),
  }),
)

export type Department = typeof department.$inferSelect
export type NewDepartment = typeof department.$inferInsert
export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert
export type Tag = typeof tag.$inferSelect
export type NewTag = typeof tag.$inferInsert
export type Ticket = typeof ticket.$inferSelect
export type NewTicket = typeof ticket.$inferInsert
export type TicketTag = typeof ticketTag.$inferSelect
export type NewTicketTag = typeof ticketTag.$inferInsert
export type TicketTransfer = typeof ticketTransfer.$inferSelect
export type NewTicketTransfer = typeof ticketTransfer.$inferInsert
export type TicketHistory = typeof ticketHistory.$inferSelect
export type NewTicketHistory = typeof ticketHistory.$inferInsert
export type Message = typeof message.$inferSelect
export type NewMessage = typeof message.$inferInsert
export type MessageHistory = typeof messageHistory.$inferSelect
export type NewMessageHistory = typeof messageHistory.$inferInsert
export type Attachment = typeof attachment.$inferSelect
export type NewAttachment = typeof attachment.$inferInsert
export type AttachmentHistory = typeof attachmentHistory.$inferSelect
export type NewAttachmentHistory = typeof attachmentHistory.$inferInsert
export type Company = typeof company.$inferSelect
export type NewCompany = typeof company.$inferInsert
export type CompanyContact = typeof companyContact.$inferSelect
export type NewCompanyContact = typeof companyContact.$inferInsert
export type DepartmentGoal = typeof departmentGoal.$inferSelect
export type NewDepartmentGoal = typeof departmentGoal.$inferInsert
export type DepartmentDueHoursRow = typeof departmentDueHours.$inferSelect
export type NewDepartmentDueHoursRow = typeof departmentDueHours.$inferInsert
export type TicketQueueWait = typeof ticketQueueWait.$inferSelect
export type NewTicketQueueWait = typeof ticketQueueWait.$inferInsert

export type Role = (typeof roleEnum.enumValues)[number]
export type TicketType = (typeof ticketTypeEnum.enumValues)[number]
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number]
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number]
export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number]
export type HistoryEvent = (typeof historyEventEnum.enumValues)[number]
export type MessageVisibility =
  (typeof messageVisibilityEnum.enumValues)[number]
export type MessageHistoryEvent =
  (typeof messageHistoryEventEnum.enumValues)[number]
export type AttachmentHistoryEvent =
  (typeof attachmentHistoryEventEnum.enumValues)[number]
export type BrazilianState = (typeof brazilianStateEnum.enumValues)[number]
export type CompanyContactPosition =
  (typeof companyContactPositionEnum.enumValues)[number]
export type QueueWaitReason = (typeof queueWaitReasonEnum.enumValues)[number]
