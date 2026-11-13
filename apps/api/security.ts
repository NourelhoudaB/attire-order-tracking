import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, desc, sql } from "drizzle-orm";
import argon2 from "argon2";
import { db } from "../../db/index.js";
import {
  users,
  sessions,
  auditLog,
  passwordHistory,
  loginAttempts,
} from "../../db/schema.js";
import {
  passwordRules,
  type User,
  type Role,
} from "../../packages/shared/index.js";
import commonPasswords from "../../packages/shared/common-passwords.json";
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, code: string, message: string): never => {
  throw new AppError(status, code, message);
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const publicUser = (u: typeof users.$inferSelect) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  role: u.role as Role,
  mustChangePassword: u.mustChangePassword,
  isActive: u.isActive,
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
});
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown,
) {
  await db
    .insert(auditLog)
    .values({ userId, action, entity, entityId, details });
}
export async function authenticate(
  token: string | undefined,
  allowPasswordChange = false,
): Promise<User> {
  if (!token)
    return fail(401, "UNAUTHENTICATED", "Connectez-vous pour continuer.");
  const [row] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    );
  if (!row)
    return fail(
      401,
      "UNAUTHENTICATED",
      "Votre session a expiré. Reconnectez-vous.",
    );
  if (row.user.mustChangePassword && !allowPasswordChange)
    return fail(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Choisissez votre mot de passe pour continuer.",
    );
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() + 12 * 3600_000) })
    .where(eq(sessions.id, row.session.id));
  return publicUser(row.user);
}
export function authorize(user: User, allowed: Role[]) {
  if (!allowed.includes(user.role))
    fail(403, "FORBIDDEN", "Action non autorisée pour votre rôle");
}
export async function validatePassword(
  password: string,
  username: string,
  displayName: string,
  userId?: string,
) {
  if (
    !passwordRules(password, username, displayName).every((r) => r.ok) ||
    commonPasswords.includes(password.toLowerCase())
  )
    fail(
      400,
      "WEAK_PASSWORD",
      "Le mot de passe ne respecte pas toutes les règles de sécurité.",
    );
  if (userId) {
    const history = await db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(5);
    for (const entry of history)
      if (await argon2.verify(entry.passwordHash, password))
        fail(
          400,
          "PASSWORD_REUSED",
          "Choisissez un mot de passe différent des cinq derniers.",
        );
  }
}
export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
export async function newSession(
  userId: string,
  ip: string,
  userAgent: string,
) {
  const token = randomBytes(32).toString("hex");
  await db
    .insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + 12 * 3600_000),
      ip,
      userAgent,
    });
  return token;
}
export async function checkRateLimit(key: string) {
  const [r] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key));
  if (r?.lockedUntil && r.lockedUntil > new Date())
    fail(429, "LOCKED", "Trop de tentatives. Réessayez dans 15 minutes.");
}
export async function failedLogin(key: string) {
  await db
    .insert(loginAttempts)
    .values({ key, attempts: 1 })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        attempts: sql`CASE WHEN ${loginAttempts.windowAt} < now() - interval '15 minutes' THEN 1 ELSE ${loginAttempts.attempts} + 1 END`,
        windowAt: sql`CASE WHEN ${loginAttempts.windowAt} < now() - interval '15 minutes' THEN now() ELSE ${loginAttempts.windowAt} END`,
        lockedUntil: sql`CASE WHEN ${loginAttempts.windowAt} >= now() - interval '15 minutes' AND ${loginAttempts.attempts} >= 4 THEN now() + interval '15 minutes' ELSE NULL END`,
      },
    });
}
