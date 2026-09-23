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
  text,
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
])

export const messageVisibilityEnum = pgEnum("message_visibility", [
  "publica",
  "interna",
])

export const department = pgTable(
  "department",
  {
    id: pk(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("department_name_lower_idx").on(sql`lower(${table.name})`),
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
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tag_name_per_department_idx")
      .on(table.departmentId, sql`lower(${table.name})`)
      .where(sql`is_active`),
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
    closedAt: timestamp("closed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
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
    changedBy: integer("changed_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
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

export const departmentRelations = relations(department, ({ many }) => ({
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
}))

export const userRelations = relations(user, ({ one, many }) => ({
  department: one(department, {
    fields: [user.departmentId],
    references: [department.id],
  }),
  createdTickets: many(ticket, { relationName: "ticket_creator" }),
  assignedTickets: many(ticket, { relationName: "ticket_assignee" }),
  requestedTransfers: many(ticketTransfer, {
    relationName: "transfer_requested_by",
  }),
  reviewedTransfers: many(ticketTransfer, {
    relationName: "transfer_reviewed_by",
  }),
  historyChanges: many(ticketHistory, { relationName: "history_changed_by" }),
  messages: many(message),
  attachments: many(attachment),
  historyFromAssignee: many(ticketHistory, {
    relationName: "history_from_assignee",
  }),
  historyToAssignee: many(ticketHistory, {
    relationName: "history_to_assignee",
  }),
}))

export const tagRelations = relations(tag, ({ one, many }) => ({
  department: one(department, {
    fields: [tag.departmentId],
    references: [department.id],
  }),
  ticketTags: many(ticketTag),
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
  ticketTags: many(ticketTag),
  transfers: many(ticketTransfer),
  history: many(ticketHistory),
  messages: many(message),
  attachments: many(attachment),
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
export type Attachment = typeof attachment.$inferSelect
export type NewAttachment = typeof attachment.$inferInsert

export type Role = (typeof roleEnum.enumValues)[number]
export type TicketType = (typeof ticketTypeEnum.enumValues)[number]
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number]
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number]
export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number]
export type HistoryEvent = (typeof historyEventEnum.enumValues)[number]
export type MessageVisibility =
  (typeof messageVisibilityEnum.enumValues)[number]
