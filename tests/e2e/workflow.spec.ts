import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import {
  generateSteps,
  type Order,
  type User,
} from "../../packages/shared/index";
test.use({ trace: "off", video: "off", screenshot: "off" });
test("import, alertes, rôles, workflow et administration", async ({
  playwright,
  baseURL,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_USERNAME || !process.env.E2E_ADMIN_PASSWORD,
    "Nécessite un administrateur de test ayant déjà changé son mot de passe.",
  );
  const context = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: new URL(baseURL!).origin, "X-Tenue-Pro": "1" },
  });
  const send = (c: APIRequestContext, url: string, data: unknown = {}) =>
    c.post(`/api${url}`, { data });
  const login = await send(context, "/auth/login", {
    username: process.env.E2E_ADMIN_USERNAME,
    password: process.env.E2E_ADMIN_PASSWORD,
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).mustChangePassword).toBe(false);
  const stamp = Date.now().toString(36);
  const workers: Record<string, APIRequestContext> = {};
  for (const role of ["traceur", "magasin", "coupe", "lect"]) {
    const username = `e2e.${role}.${stamp}`,
      temporary = "aA9!" + randomBytes(16).toString("hex");
    const created = await send(context, "/users", {
      username,
      role,
      password: temporary,
    });
    expect(created.status()).toBe(200);
    const worker = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Origin: new URL(baseURL!).origin,
        "X-Tenue-Pro": "1",
      },
    });
    workers[role] = worker;
    expect(
      (
        await send(worker, "/auth/login", { username, password: temporary })
      ).status(),
    ).toBe(200);
    expect((await worker.get("/api/orders")).status()).toBe(403);
    expect(
      (
        await send(worker, "/auth/change-password", { password: "faible" })
      ).status(),
    ).toBe(400);
    const finalPassword = "bB7!" + randomBytes(16).toString("hex");
    expect(
      (
        await send(worker, "/auth/change-password", { password: finalPassword })
      ).status(),
    ).toBe(200);
    expect(
      (
        await send(worker, "/auth/change-password", { password: temporary })
      ).status(),
    ).toBe(400);
  }
  const refs = [`TEST-${stamp}-A`, `TEST-${stamp}-B`, `TEST-${stamp}-C`];
  const text = `N°;client;produit;quantité;tissu;personnalisation;téléphone\n${refs[0]};Atelier test DTF;Tablier;12;;dtf;20123456\n${refs[1]};Atelier test broderie;Veste;8;;broderie;22123456\n${refs[2]};Atelier test simple;Polo;6;;;24123456`;
  expect(
    await (await send(context, "/orders/import-csv", { text })).json(),
  ).toMatchObject({ created: 3, skipped: 0 });
  expect(
    await (await send(context, "/orders/import-csv", { text })).json(),
  ).toMatchObject({ created: 0, skipped: 3 });
  let list = (await (
    await context.get(`/api/orders?q=${encodeURIComponent(stamp)}`)
  ).json()) as Order[];
  expect(list).toHaveLength(3);
  const dtf = list.find((o) => o.ref === refs[0])!,
    emb = list.find((o) => o.ref === refs[1])!,
    plain = list.find((o) => o.ref === refs[2])!;
  expect((await send(context, `/orders/${dtf.id}/plan`)).status()).toBe(400);
  await context.patch(`/api/orders/${dtf.id}`, {
    data: { fabric: "Sergé noir", personalization: "dtf", isExpress: true },
  });
  await context.patch(`/api/orders/${emb.id}`, {
    data: { fabric: "Gabardine", isPriority: true },
  });
  await context.patch(`/api/orders/${plain.id}`, {
    data: { fabric: "Piqué", isStockout: true, stockoutNote: "Piqué 12 m" },
  });
  expect((await send(context, `/orders/${plain.id}/plan`)).status()).toBe(409);
  let alerts = await (await workers.magasin.get("/api/messages")).json();
  expect(
    alerts.some(
      (m: any) =>
        m.orderRef === plain.ref && m.body.includes("Rupture de stock"),
    ),
  ).toBe(true);
  for (const order of [dtf, emb])
    expect((await send(context, `/orders/${order.id}/plan`)).status()).toBe(
      200,
    );
  alerts = await (await workers.traceur.get("/api/messages")).json();
  expect(
    alerts.some(
      (m: any) => m.orderRef === dtf.ref && m.body.startsWith("⚡ EXPRESS ·"),
    ),
  ).toBe(true);
  let current = (await (
    await context.get(`/api/orders/${dtf.id}`)
  ).json()) as Order;
  expect(current.steps.map((s) => s.stepCode)).toEqual(
    generateSteps("dtf").map((s) => s.code),
  );
  expect(
    (
      await send(workers.coupe, `/orders/${dtf.id}/steps/current/complete`, {
        expectedStepId: current.steps[0].id,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await send(context, `/orders/${dtf.id}/steps/current/complete`, {
        expectedStepId: current.steps[1].id,
      })
    ).status(),
  ).toBe(409);
  const duplicate = () =>
    send(workers.traceur, `/orders/${dtf.id}/steps/current/complete`, {
      expectedStepId: current.steps[0].id,
    });
  const responses = await Promise.all([duplicate(), duplicate()]);
  expect(responses.filter((r) => r.status() === 200)).toHaveLength(1);
  while (true) {
    current = await (await context.get(`/api/orders/${dtf.id}`)).json();
    if (current.status === "delivered") break;
    expect(
      (
        await send(context, `/orders/${dtf.id}/steps/current/complete`, {
          expectedStepId: current.steps[current.stepIndex].id,
        })
      ).status(),
    ).toBe(200);
  }
  expect(current.stepIndex).toBe(current.steps.length);
  expect(current.steps.every((s) => s.doneAt && s.doneByUserId)).toBe(true);
  alerts = await (await context.get("/api/messages")).json();
  expect(
    alerts.some(
      (m: any) => m.orderRef === dtf.ref && m.body.includes("Commande livrée"),
    ),
  ).toBe(true);
  expect((await send(context, `/orders/${dtf.id}/unplan`)).status()).toBe(409);
  expect(
    (
      await send(workers.lect, "/messages", { toRole: "all", body: "Interdit" })
    ).status(),
  ).toBe(403);
  for (const q of [dtf.ref, "20123456"])
    expect(
      (await (await context.get(`/api/orders?q=${q}`)).json()).some(
        (o: Order) => o.id === dtf.id,
      ),
    ).toBe(true);
  for (const worker of Object.values(workers)) await worker.dispose();
  await context.dispose();
});
