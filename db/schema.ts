import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  doublePrecision,
  jsonb,
  date,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
const id = () => uuid("id").defaultRandom().primaryKey();
const at = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const users = pgTable("users", {
  id: id(),
  identityId: text("identity_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: at("created_at"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});
export const passwordHistory = pgTable("password_history", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  passwordHash: text("password_hash").notNull(),
  createdAt: at("created_at"),
});
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent").notNull().default(""),
  ip: text("ip").notNull().default(""),
});
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowAt: at("window_at"),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
export const orders = pgTable(
  "orders",
  {
    id: id(),
    ref: text("ref").notNull().unique(),
    client: text("client").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    product: text("product").notNull(),
    quantity: integer("quantity").notNull(),
    fabric: text("fabric").notNull().default(""),
    fabricMeters: doublePrecision("fabric_meters"),
    personalization: text("personalization").notNull().default("none"),
    status: text("status").notNull().default("imported"),
    isPriority: boolean("is_priority").notNull().default(false),
    isExpress: boolean("is_express").notNull().default(false),
    isStockout: boolean("is_stockout").notNull().default(false),
    stockoutNote: text("stockout_note").notNull().default(""),
    plannedDate: date("planned_date"),
    stepIndex: integer("step_index").notNull().default(0),
    source: text("source").notNull().default("csv"),
    externalId: text("external_id").unique(),
    rawPayload: jsonb("raw_payload"),
    createdAt: at("created_at"),
    updatedAt: at("updated_at"),
  },
  (t) => [
    index("orders_status_planned_idx").on(t.status, t.plannedDate),
    index("orders_phone_idx").on(t.phone),
  ],
);
export const orderSteps = pgTable(
  "order_steps",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    position: integer("position").notNull(),
    stepCode: text("step_code").notNull(),
    ownerRole: text("owner_role").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneByUserId: uuid("done_by_user_id").references(() => users.id),
    doneByRole: text("done_by_role"),
  },
  (t) => [index("steps_order_idx").on(t.orderId)],
);
export const messages = pgTable(
  "messages",
  {
    id: id(),
    kind: text("kind").notNull(),
    fromUserId: uuid("from_user_id").references(() => users.id),
    fromRole: text("from_role").notNull().default("system"),
    toRole: text("to_role").notNull(),
    orderRef: text("order_ref"),
    body: text("body").notNull(),
    createdAt: at("created_at"),
  },
  (t) => [index("messages_recipient_idx").on(t.toRole, t.createdAt)],
);
export const messageReads = pgTable(
  "message_reads",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    readAt: at("read_at"),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);
export const auditLog = pgTable("audit_log", {
  id: id(),
  at: at("at"),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
});
export const syncRuns = pgTable("sync_runs", {
  id: id(),
  startedAt: at("started_at"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  source: text("source").notNull(),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  errors: jsonb("errors"),
});
