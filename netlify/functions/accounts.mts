import type { Config, Context } from "@netlify/functions";
import { admin, login } from "@netlify/identity";
import { z, ZodError } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import argon2 from "argon2";
import { db } from "../../db/index.js";
import {
  users,
  sessions,
  passwordHistory,
  loginAttempts,
} from "../../db/schema.js";
import { roles, usernameSchema } from "../../packages/shared/index.js";
import {
  AppError,
  fail,
  authenticate,
  authorize,
  publicUser,
  audit,
  hashToken,
  newSession,
  validatePassword,
  hashPassword,
  checkRateLimit,
  failedLogin,
} from "../../apps/api/security.js";
const accountSchema = z.object({
  username: usernameSchema,
  displayName: z.string().max(100).default(""),
  role: z.enum(roles),
  password: z.string().max(128),
});
const email = (username: string) => `${username}@accounts.tenue-pro.invalid`;
const cookie = (token: string) =>
  `tp_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`;
export default async function handler(req: Request, context: Context) {
  const path = new URL(req.url).pathname,
    method = req.method;
  const token = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)tp_session=([^;]+)/)?.[1];
  try {
    if (
      method !== "GET" &&
      (req.headers.get("x-tenue-pro") !== "1" ||
        req.headers.get("origin") !== new URL(req.url).origin)
    )
      fail(403, "CSRF", "Origine de la requête non autorisée.");
    let out: unknown = { ok: true };
    let sessionCookie: string | undefined;
    if (path === "/api/auth/login" && method === "POST") {
      const { username, password } = z
        .object({ username: usernameSchema, password: z.string().max(128) })
        .parse(await req.json());
      const ipKey = `ip:${context.ip}`,
        nameKey = `user:${username}`;
      await checkRateLimit(ipKey);
      await checkRateLimit(nameKey);
      let [u] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (!u) {
        // Bootstrap uses configured server values only; it is disabled once any account exists.
        const initialName = Netlify.env.get("ADMIN_USERNAME"),
          initialPassword = Netlify.env.get("ADMIN_INITIAL_PASSWORD");
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users);
        if (
          count === 0 &&
          initialName === username &&
          initialPassword &&
          password === initialPassword
        ) {
          await validatePassword(password, username, "");
          const identity = await admin.createUser({
            email: email(username),
            password,
            data: { app_metadata: { roles: ["admin"] } },
          });
          const passwordHash = await hashPassword(password);
          [u] = await db
            .insert(users)
            .values({
              username,
              identityId: identity.id,
              role: "admin",
              passwordHash,
            })
            .onConflictDoNothing()
            .returning();
          if (u) {
            await db
              .insert(passwordHistory)
              .values({ userId: u.id, passwordHash });
            await audit(u.id, "account.bootstrap", "users", u.id);
          }
        }
      }
      if (
        !u ||
        !u.isActive ||
        !(await argon2.verify(u.passwordHash, password))
      ) {
        await failedLogin(ipKey);
        await failedLogin(nameKey);
        await audit(u?.id ?? null, "auth.failure", "users", u?.id);
        fail(
          401,
          "INVALID_CREDENTIALS",
          "Identifiant ou mot de passe incorrect.",
        );
      }
      try {
        await login(email(username), password);
      } catch {
        fail(
          503,
          "IDENTITY_UNAVAILABLE",
          "La connexion est temporairement indisponible. Réessayez.",
        );
      }
      // Identity tokens never reach the app browser: business APIs use an opaque, HttpOnly session.
      context.cookies.delete("nf_jwt");
      context.cookies.delete("nf_refresh");
      await db.delete(loginAttempts).where(eq(loginAttempts.key, nameKey));
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null })
        .where(eq(users.id, u.id));
      sessionCookie = cookie(
        await newSession(u.id, context.ip, req.headers.get("user-agent") ?? ""),
      );
      await audit(u.id, "auth.login", "users", u.id);
      out = publicUser(u);
    } else {
      const user = await authenticate(token, true);
      sessionCookie = cookie(token!);
      if (path === "/api/auth/me" && method === "GET") out = user;
      else if (path === "/api/auth/logout" && method === "POST") {
        await db.delete(sessions).where(eq(sessions.id, hashToken(token!)));
        sessionCookie =
          "tp_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
        await audit(user.id, "auth.logout", "users", user.id);
      } else if (path === "/api/auth/change-password" && method === "POST") {
        const { password } = z
          .object({ password: z.string().max(128) })
          .parse(await req.json());
        await validatePassword(
          password,
          user.username,
          user.displayName,
          user.id,
        );
        const [u] = await db.select().from(users).where(eq(users.id, user.id));
        await admin.updateUser(u.identityId, { password });
        const passwordHash = await hashPassword(password);
        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({ passwordHash, mustChangePassword: false })
            .where(eq(users.id, user.id));
          await tx
            .insert(passwordHistory)
            .values({ userId: user.id, passwordHash });
          await tx.delete(sessions).where(eq(sessions.userId, user.id));
        });
        sessionCookie = cookie(
          await newSession(
            user.id,
            context.ip,
            req.headers.get("user-agent") ?? "",
          ),
        );
        await audit(user.id, "account.password_changed", "users", user.id);
        out = { ...user, mustChangePassword: false };
      } else {
        if (user.mustChangePassword)
          fail(
            403,
            "PASSWORD_CHANGE_REQUIRED",
            "Choisissez votre mot de passe pour continuer.",
          );
        authorize(user, ["admin"]);
        if (path === "/api/users" && method === "GET")
          out = (await db.select().from(users).orderBy(users.username)).map(
            publicUser,
          );
        else if (path === "/api/users" && method === "POST") {
          const data = accountSchema.parse(await req.json());
          await validatePassword(
            data.password,
            data.username,
            data.displayName,
          );
          if (
            (
              await db
                .select()
                .from(users)
                .where(eq(users.username, data.username))
            ).length
          )
            fail(409, "DUPLICATE", "Cet identifiant existe déjà.");
          const identity = await admin.createUser({
            email: email(data.username),
            password: data.password,
            data: { app_metadata: { roles: [data.role] } },
          });
          const passwordHash = await hashPassword(data.password);
          const [u] = await db
            .insert(users)
            .values({
              username: data.username,
              displayName: data.displayName,
              role: data.role,
              identityId: identity.id,
              passwordHash,
            })
            .returning();
          await db
            .insert(passwordHistory)
            .values({ userId: u.id, passwordHash });
          await audit(user.id, "account.created", "users", u.id);
          out = publicUser(u);
        } else {
          const match = path.match(
            /^\/api\/users\/([\da-f-]+)(?:\/(reset-password|revoke-sessions))?$/,
          );
          if (!match) fail(404, "NOT_FOUND", "Ressource introuvable.");
          const id = z.string().uuid().parse(match![1]);
          const action = match![2];
          const [u] = await db.select().from(users).where(eq(users.id, id));
          if (!u) fail(404, "NOT_FOUND", "Compte introuvable.");
          if (action === "reset-password" && method === "POST") {
            const { password } = z
              .object({ password: z.string().max(128) })
              .parse(await req.json());
            await validatePassword(password, u.username, u.displayName, u.id);
            await admin.updateUser(u.identityId, { password });
            const passwordHash = await hashPassword(password);
            await db.transaction(async (tx) => {
              await tx
                .update(users)
                .set({ passwordHash, mustChangePassword: true })
                .where(eq(users.id, id));
              await tx
                .insert(passwordHistory)
                .values({ userId: id, passwordHash });
              await tx.delete(sessions).where(eq(sessions.userId, id));
            });
            await audit(user.id, "account.reset", "users", id);
          } else if (action === "revoke-sessions" && method === "POST") {
            await db.delete(sessions).where(eq(sessions.userId, id));
            await audit(user.id, "account.sessions_revoked", "users", id);
          } else if (!action && method === "PATCH") {
            const data = z
              .object({
                role: z.enum(roles).optional(),
                displayName: z.string().max(100).optional(),
                isActive: z.boolean().optional(),
              })
              .strict()
              .parse(await req.json());
            if (
              id === user.id &&
              (data.isActive === false || (data.role && data.role !== "admin"))
            )
              fail(
                400,
                "SELF_DEACTIVATION",
                "Votre propre compte administrateur doit rester actif.",
              );
            await db.update(users).set(data).where(eq(users.id, id));
            await db.delete(sessions).where(eq(sessions.userId, id));
            await audit(user.id, "account.updated", "users", id);
            out = { ...publicUser(u), ...data };
          } else fail(405, "METHOD", "Méthode non autorisée.");
        }
      }
    }
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (sessionCookie) headers["Set-Cookie"] = sessionCookie;
    return Response.json(out, { headers });
  } catch (e) {
    if (e instanceof AppError)
      return Response.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status },
      );
    if (e instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION",
            message: e.issues[0]?.message ?? "Champs invalides.",
          },
        },
        { status: 400 },
      );
    return Response.json(
      {
        error: {
          code: "SERVICE_ERROR",
          message: "Service temporairement indisponible. Réessayez.",
        },
      },
      { status: 503 },
    );
  }
}
export const config: Config = {
  path: ["/api/auth/*", "/api/users", "/api/users/*"],
};
