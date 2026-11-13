import Fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import { eq, and, or, desc, asc, ilike, inArray, sql, gt } from "drizzle-orm";
import { z, ZodError } from "zod";
import { db } from "../../db/index.js";
import {
  orders,
  orderSteps,
  messages,
  messageReads,
  auditLog,
  syncRuns,
  sessions,
} from "../../db/schema.js";
import {
  generateSteps,
  roles,
  orderPatchSchema,
  stepDefinitions,
  canComplete,
  type User,
  type Role,
} from "../../packages/shared/index.js";
import {
  AppError,
  fail,
  authenticate,
  authorize,
  hashToken,
} from "./security.js";
import { parseCsv, normalizeRows } from "./sources.js";
const app = Fastify({
  logger: false,
  bodyLimit: 8 * 1024 * 1024,
  trustProxy: true,
});
await app.register(cookie);
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
});
await app.register(swagger, {
  openapi: {
    info: {
      title: "TENUE PRO · API",
      version: "1.0.0",
      description:
        "Suivi de chaîne. Authentification par session serveur ; en-tête X-Tenue-Pro: 1 et Origin de même origine pour les mutations.",
    },
    components: {
      securitySchemes: {
        session: { type: "apiKey", in: "cookie", name: "tp_session" },
      },
    },
    security: [{ session: [] }],
  },
});
declare module "fastify" {
  interface FastifyRequest {
    user: User;
  }
}
app.setErrorHandler((e, req, reply) => {
  if (e instanceof AppError)
    return reply
      .code(e.status)
      .send({ error: { code: e.code, message: e.message } });
  if (e instanceof ZodError)
    return reply.code(400).send({
      error: {
        code: "VALIDATION",
        message: e.issues[0]?.message ?? "Champs invalides.",
      },
    });
  return reply.code(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "Une erreur est survenue. Réessayez.",
    },
  });
});
app.addHook("preHandler", async (req, reply) => {
  if (!req.url.startsWith("/api/")) return;
  reply.header("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.origin;
    const allowed = [
      process.env.URL,
      process.env.DEPLOY_PRIME_URL,
      "http://localhost:8889",
    ]
      .filter(Boolean)
      .flatMap((u) => {
        const origin = new URL(u!).origin;
        return origin.startsWith("http://localhost")
          ? [origin]
          : [origin, origin.replace(/^http:/, "https:")];
      });
    if (
      req.headers["x-tenue-pro"] !== "1" ||
      !origin ||
      !allowed.includes(origin)
    )
      fail(403, "CSRF", "Origine de la requête non autorisée.");
  }
  req.user = await authenticate(req.cookies.tp_session);
  reply.setCookie("tp_session", req.cookies.tp_session!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
});
const manager = (u: User) => authorize(u, ["admin", "manager"]);
const uuid = (id: unknown) => z.string().uuid().parse(id);
const orderId = (req: any) => uuid(req.params.id);
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
async function getOrder(id: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) fail(404, "NOT_FOUND", "Commande introuvable.");
  return o;
}
async function alert(
  tx: any,
  o: typeof orders.$inferSelect,
  toRole: string,
  body: string,
) {
  await tx.insert(messages).values({
    kind: "alert",
    fromRole: "system",
    toRole,
    orderRef: o.ref,
    body: `${o.isExpress ? "⚡ EXPRESS · " : ""}${body}${body === "Commande livrée" ? " : " : " — "}${o.ref} (${o.client})`,
  });
}
async function log(
  tx: any,
  u: User,
  action: string,
  id: string,
  details?: unknown,
) {
  await tx
    .insert(auditLog)
    .values({ userId: u.id, action, entity: "orders", entityId: id, details });
}
app.get(
  "/api/orders",
  {
    schema: {
      description:
        "Liste des commandes et de leurs étapes. Recherche sur référence, client et téléphone.",
      tags: ["Commandes"],
    },
  },
  async (req) => {
    const { q, status } = z
      .object({
        q: z.string().max(200).optional(),
        status: z.enum(["imported", "planned", "delivered"]).optional(),
      })
      .parse(req.query);
    const conditions = [];
    if (status) conditions.push(eq(orders.status, status));
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(orders.ref, pattern),
          ilike(orders.client, pattern),
          ilike(orders.phone, pattern),
        )!,
      );
    }
    const list = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(
        desc(orders.isExpress),
        desc(orders.isPriority),
        asc(orders.createdAt),
      );
    if (!list.length) return [];
    const steps = await db
      .select()
      .from(orderSteps)
      .where(
        inArray(
          orderSteps.orderId,
          list.map((o) => o.id),
        ),
      )
      .orderBy(asc(orderSteps.position));
    return list.map((o) => ({
      ...o,
      steps: steps.filter((s) => s.orderId === o.id),
      rawPayload: undefined,
    }));
  },
);
app.get("/api/orders/:id", async (req) => {
  const o = await getOrder(orderId(req));
  return {
    ...o,
    rawPayload: undefined,
    steps: await db
      .select()
      .from(orderSteps)
      .where(eq(orderSteps.orderId, o.id))
      .orderBy(asc(orderSteps.position)),
  };
});
app.patch("/api/orders/:id", async (req) => {
  manager(req.user);
  const id = orderId(req);
  const data = orderPatchSchema.parse(req.body);
  return db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) fail(404, "NOT_FOUND", "Commande introuvable.");
    if (o.status !== "imported")
      fail(
        409,
        "ALREADY_PLANNED",
        "Seule une commande importée peut être modifiée.",
      );
    const [updated] = await tx
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    if (data.isStockout !== undefined && data.isStockout !== o.isStockout)
      await alert(
        tx,
        updated,
        "magasin",
        data.isStockout
          ? `Rupture de stock : ${updated.stockoutNote || "à préciser"}`
          : "Rupture levée",
      );
    await log(tx, req.user, "order.updated", id, data);
    return updated;
  });
});
app.post("/api/orders/:id/plan", async (req) => {
  manager(req.user);
  const id = orderId(req);
  return db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) fail(404, "NOT_FOUND", "Commande introuvable.");
    if (o.status !== "imported")
      fail(409, "ALREADY_PLANNED", "Cette commande est déjà au planning.");
    if (!o.fabric.trim())
      fail(400, "FABRIC_REQUIRED", "Indiquez le tissu à utiliser.");
    if (o.isStockout)
      fail(
        409,
        "STOCKOUT",
        "En rupture de stock : levez la rupture avant de planifier.",
      );
    const steps = generateSteps(o.personalization as any);
    await tx.insert(orderSteps).values(
      steps.map((s, i) => ({
        orderId: id,
        position: i,
        stepCode: s.code,
        ownerRole: s.role,
      })),
    );
    await tx
      .update(orders)
      .set({
        status: "planned",
        plannedDate: today(),
        stepIndex: 0,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
    await alert(tx, o, steps[0].role, `À vous : ${steps[0].label}`);
    await log(tx, req.user, "order.planned", id);
    return { ok: true };
  });
});
app.post("/api/orders/:id/unplan", async (req) => {
  manager(req.user);
  const id = orderId(req);
  return db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) fail(404, "NOT_FOUND", "Commande introuvable.");
    if (o.status !== "planned" || o.stepIndex !== 0)
      fail(
        409,
        "STARTED",
        "Une commande déjà démarrée ne peut pas être retirée du planning.",
      );
    await tx.delete(orderSteps).where(eq(orderSteps.orderId, id));
    await tx
      .update(orders)
      .set({ status: "imported", plannedDate: null, updatedAt: new Date() })
      .where(eq(orders.id, id));
    await log(tx, req.user, "order.unplanned", id);
    return { ok: true };
  });
});
app.post(
  "/api/orders/:id/steps/current/complete",
  {
    schema: {
      description:
        "Valide uniquement l’étape courante, dans une transaction verrouillant la commande. expectedStepId empêche une double validation.",
      tags: ["Étapes"],
      body: {
        type: "object",
        required: ["expectedStepId"],
        properties: { expectedStepId: { type: "string", format: "uuid" } },
      },
    },
  },
  async (req) => {
    const id = orderId(req);
    const { expectedStepId } = z
      .object({ expectedStepId: z.string().uuid() })
      .parse(req.body);
    return db.transaction(async (tx) => {
      const [o] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("update");
      if (!o) fail(404, "NOT_FOUND", "Commande introuvable.");
      const steps = await tx
        .select()
        .from(orderSteps)
        .where(eq(orderSteps.orderId, id))
        .orderBy(asc(orderSteps.position));
      const current = steps[o.stepIndex];
      if (!current || o.status !== "planned")
        fail(409, "NO_CURRENT_STEP", "Aucune étape à valider.");
      if (
        !canComplete(
          req.user.role,
          current.ownerRole as Role,
          o.stepIndex,
          current.position,
        )
      )
        fail(403, "FORBIDDEN", "Action non autorisée pour votre rôle");
      if (current.id !== expectedStepId || current.doneAt)
        fail(409, "STEP_CHANGED", "L’étape a changé. Actualisez la commande.");
      await tx
        .update(orderSteps)
        .set({
          doneAt: new Date(),
          doneByUserId: req.user.id,
          doneByRole: req.user.role,
        })
        .where(eq(orderSteps.id, current.id));
      const next = steps[o.stepIndex + 1];
      await tx
        .update(orders)
        .set({
          stepIndex: o.stepIndex + 1,
          status: next ? "planned" : "delivered",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      if (next)
        await alert(
          tx,
          o,
          next.ownerRole,
          `À vous : ${stepDefinitions.find((s) => s.code === next.stepCode)!.label}`,
        );
      else await alert(tx, o, "manager", "Commande livrée");
      await log(tx, req.user, "step.completed", id, {
        stepCode: current.stepCode,
      });
      return { ok: true };
    });
  },
);
app.post("/api/orders/import-csv", async (req) => {
  manager(req.user);
  const body = z
    .object({
      text: z.string().max(5_000_000).optional(),
      xlsx: z.string().max(7_000_000).optional(),
    })
    .refine(
      (b) => !!b.text !== !!b.xlsx,
      "Choisissez un fichier ou collez le contenu.",
    )
    .parse(req.body);
  const [run] = await db.insert(syncRuns).values({ source: "csv" }).returning();
  try {
    let parsed: ReturnType<typeof parseCsv>;
    if (body.xlsx) {
      const { default: readXlsxFile } = await import("read-excel-file/node");
      const rows = await readXlsxFile(Buffer.from(body.xlsx, "base64"));
      parsed = normalizeRows(rows);
    } else parsed = parseCsv(body.text!);
    if (parsed.errors.length) {
      await db
        .update(syncRuns)
        .set({ finishedAt: new Date(), errors: parsed.errors })
        .where(eq(syncRuns.id, run.id));
      fail(400, "IMPORT", parsed.errors.slice(0, 5).join("\n"));
    }
    if (!parsed.orders.length)
      fail(400, "EMPTY_IMPORT", "Aucune commande trouvée dans cet export.");
    const count = await db.transaction(async (tx) => {
      let count = 0;
      for (const o of parsed.orders) {
        const saved = await tx
          .insert(orders)
          .values({ ...o, source: "csv" })
          .onConflictDoNothing()
          .returning({ id: orders.id });
        count += saved.length;
      }
      await tx
        .update(syncRuns)
        .set({ created: count, finishedAt: new Date(), errors: [] })
        .where(eq(syncRuns.id, run.id));
      await log(tx, req.user, "orders.imported", run.id, {
        created: count,
        skipped: parsed.orders.length - count,
      });
      return count;
    });
    return { created: count, skipped: parsed.orders.length - count };
  } catch (e) {
    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        errors: [
          e instanceof AppError
            ? e.message
            : "Export invalide ou service indisponible.",
        ],
      })
      .where(eq(syncRuns.id, run.id));
    if (e instanceof AppError) throw e;
    fail(400, "IMPORT", "Impossible de lire cet export. Vérifiez son format.");
  }
});
app.post("/api/sync/oneboard", async (req) => {
  manager(req.user);
  const message =
    "La synchronisation automatique nécessite la documentation API de Oneboard. Importez un export CSV ou Excel en attendant.";
  await db
    .insert(syncRuns)
    .values({ source: "oneboard", finishedAt: new Date(), errors: [message] });
  fail(501, "ONEBOARD_NOT_CONFIGURED", message);
});
const visible = (u: User) =>
  u.role === "admin"
    ? undefined
    : or(eq(messages.toRole, u.role), eq(messages.toRole, "all"));
app.get("/api/messages", async (req) => {
  const list = await db
    .select()
    .from(messages)
    .where(visible(req.user))
    .orderBy(desc(messages.createdAt))
    .limit(500);
  if (!list.length) return [];
  const reads = await db
    .select()
    .from(messageReads)
    .where(
      and(
        eq(messageReads.userId, req.user.id),
        inArray(
          messageReads.messageId,
          list.map((m) => m.id),
        ),
      ),
    );
  return list.map((m) => ({
    ...m,
    read: reads.some((r) => r.messageId === m.id),
  }));
});
app.post("/api/messages", async (req) => {
  if (req.user.role === "lect")
    fail(403, "FORBIDDEN", "Action non autorisée pour votre rôle");
  const body = z
    .object({
      toRole: z.enum(["all", ...roles]),
      orderRef: z.string().max(100).optional(),
      body: z.string().trim().min(1).max(5000),
    })
    .strict()
    .parse(req.body);
  const [msg] = await db
    .insert(messages)
    .values({
      ...body,
      fromRole: req.user.role,
      fromUserId: req.user.id,
      kind: "message",
    })
    .returning();
  return msg;
});
app.post("/api/messages/read", async (req) => {
  const { ids } = z
    .object({ ids: z.array(z.string().uuid()).max(500) })
    .parse(req.body);
  if (!ids.length) return { ok: true };
  const allowed = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(visible(req.user), inArray(messages.id, ids)));
  if (allowed.length)
    await db
      .insert(messageReads)
      .values(allowed.map((m) => ({ messageId: m.id, userId: req.user.id })))
      .onConflictDoNothing();
  return { ok: true };
});
app.get("/api/audit", async (req) => {
  authorize(req.user, ["admin"]);
  return db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(200);
});
app.get("/api/sync/runs", async (req) => {
  authorize(req.user, ["admin"]);
  return db
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(100);
});
app.get("/api/openapi.json", async (req) => {
  authorize(req.user, ["admin"]);
  return app.swagger();
});
app.get("/api/events", async (req, reply) => {
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  let closed = false,
    last = "";
  let timer: ReturnType<typeof setTimeout>;
  reply.raw.on("close", () => {
    closed = true;
    clearTimeout(timer);
  });
  reply.raw.write("event: connected\ndata: {}\n\n");
  const tick = async () => {
    if (closed) return;
    try {
      const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.id, hashToken(req.cookies.tp_session!)),
            gt(sessions.expiresAt, new Date()),
          ),
        );
      if (!session) {
        reply.raw.write("event: expired\ndata: {}\n\n");
        reply.raw.end();
        return;
      }
      const [o] = await db
        .select({ at: sql<string>`max(${orders.updatedAt})` })
        .from(orders);
      const [m] = await db
        .select({ at: sql<string>`max(${messages.createdAt})` })
        .from(messages)
        .where(visible(req.user));
      const marker = JSON.stringify([o.at, m.at]);
      if (marker !== last) {
        last = marker;
        reply.raw.write(`event: change\ndata: {}\n\n`);
      } else reply.raw.write(": heartbeat\n\n");
    } catch {
      reply.raw.end();
      return;
    }
    if (!closed) timer = setTimeout(tick, 2500);
  };
  await tick();
});
app.setNotFoundHandler((req, reply) =>
  reply
    .code(404)
    .send({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } }),
);
await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
