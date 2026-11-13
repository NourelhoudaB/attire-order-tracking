import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";
/** Operational snapshot: excludes all passwords, password hashes, tokens and sessions. */
export default async () => {
  const client = await getDatabase().pool.connect();
  const snapshot: Record<string, unknown> = {
    version: 1,
    createdAt: new Date().toISOString(),
    scope: "workflow-only",
  };
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    for (const table of [
      "orders",
      "order_steps",
      "messages",
      "message_reads",
      "audit_log",
      "sync_runs",
    ])
      snapshot[table] = (await client.query(`SELECT * FROM ${table}`)).rows;
    snapshot.users = (
      await client.query(
        "SELECT id, identity_id, username, display_name, role, is_active, created_at, last_login_at FROM users",
      )
    ).rows;
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw new Error("La sauvegarde quotidienne a échoué.");
  } finally {
    client.release();
  }
  const store = getStore("tenue-pro-workflow-backups");
  const date = new Date().toISOString().slice(0, 10);
  await store.setJSON(`${date}.json`, snapshot);
  const cutoff = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  for await (const page of store.list({ paginate: true }))
    for (const item of page.blobs)
      if (item.key.slice(0, 10) < cutoff) await store.delete(item.key);
};
export const config: Config = { schedule: "0 2 * * *" };
