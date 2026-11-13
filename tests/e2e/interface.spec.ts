import { test, expect } from "@playwright/test";
for (const colorScheme of ["light", "dark"] as const) {
  test(`aperçu accessible et sans débordement · ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Se connecter", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Découvrir un aperçu/ }).click();
    await expect(
      page.getByRole("heading", { name: /Chaque étape compte/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Suivi", exact: true }).click();
    await page.getByRole("searchbox").fill("TP-1042");
    await expect(
      page.getByRole("heading", { name: "Hôtel Le Royal" }),
    ).toBeVisible();
    await page.getByRole("searchbox").fill("introuvable-000");
    await expect(
      page.getByRole("heading", { name: "Aucune commande trouvée." }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Messages/ }).click();
    await expect(
      page.getByRole("button", { name: "Envoyer", exact: true }),
    ).toBeDisabled();
  });
}
test("refuse une API de production sans session", async ({ request }) => {
  const result = await request.get("/api/orders");
  expect(result.status()).toBe(401);
  expect(await result.json()).toMatchObject({
    error: { code: "UNAUTHENTICATED" },
  });
});
