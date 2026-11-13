import { describe, it, expect } from "vitest";
import {
  generateSteps,
  canComplete,
  roles,
  passwordRules,
  sortOrders,
} from "../packages/shared/index";
import { parseCsv } from "../apps/api/sources";
describe("Étapes et autorisations", () => {
  it("exclut toutes les étapes de personnalisation sans personnalisation", () => {
    const codes = generateSteps("none").map((s) => s.code);
    expect(codes).toHaveLength(8);
    expect(codes).not.toContain("broderie");
    expect(codes).not.toContain("logo");
    expect(codes).not.toContain("dtf");
    expect(codes.at(-1)).toBe("livraison");
  });
  it("ajoute exclusivement la broderie quand applicable", () => {
    const steps = generateSteps("embroidery").map((s) => s.code);
    expect(steps).toHaveLength(9);
    expect(steps.indexOf("broderie")).toBe(6);
    expect(steps).not.toContain("logo");
  });
  it("place sortie logo avant impression DTF et emballage", () => {
    expect(
      generateSteps("dtf")
        .slice(6)
        .map((s) => s.code),
    ).toEqual(["logo", "dtf", "emballage", "livraison"]);
  });
  it("interdit toutes les étapes futures, y compris pour admin", () => {
    for (const role of roles)
      expect(canComplete(role, "coupe", 2, 3)).toBe(false);
  });
  it("autorise uniquement le propriétaire et admin pour chaque étape", () => {
    for (const step of generateSteps("dtf"))
      for (const role of roles)
        expect(canComplete(role, step.role, 3, 3)).toBe(
          role === step.role || role === "admin",
        );
  });
});
describe("Règles de mot de passe", () => {
  it("refuse longueur, classe manquante, identité contenue ou répétition", () => {
    for (const password of [
      "Court1!",
      "abcdefghijklmnop",
      "ABCDEFGHIJKL9!",
      "Abcdefghijkl!",
      "Abcdefghijk123",
      "AxAAA-mZ7_q2",
      "Coupe-Z9!pL_k2",
    ])
      expect(passwordRules(password, "coupe").every((r) => r.ok)).toBe(false);
  });
  it("refuse le nom d’affichage indépendamment de la casse", () =>
    expect(
      passwordRules("Z9!kArIm_mL2q", "coupe", "Karim").every((r) => r.ok),
    ).toBe(false));
  it("accepte un mot de passe conforme indépendant du compte", () =>
    expect(passwordRules("Az9!_mLp2-Qv7", "coupe").every((r) => r.ok)).toBe(
      true,
    ));
});
describe("Tri", () => {
  it("express puis prioritaire puis arrivée, sans mutation", () => {
    const data = [
      { id: 1, isExpress: false, isPriority: true, createdAt: "2026-11-01" },
      { id: 2, isExpress: true, isPriority: false, createdAt: "2026-11-03" },
      { id: 3, isExpress: false, isPriority: false, createdAt: "2026-10-01" },
      { id: 4, isExpress: false, isPriority: true, createdAt: "2026-10-20" },
    ];
    expect(sortOrders(data).map((o) => o.id)).toEqual([2, 4, 1, 3]);
    expect(data[0].id).toBe(1);
  });
});
describe("Import", () => {
  it.each([";", ",", "\t"])(
    "lit les six colonnes séparées par %s",
    (separator) => {
      const data = [
        [
          "N°",
          "client",
          "produit",
          "quantité",
          "tissu",
          "personnalisation",
        ].join(separator),
        [
          "TP-101",
          "Client atelier",
          "Veste",
          "12",
          "Gabardine",
          "broderie",
        ].join(separator),
      ].join("\n");
      const result = parseCsv(data);
      expect(result.errors).toEqual([]);
      expect(result.orders[0]).toMatchObject({
        ref: "TP-101",
        quantity: 12,
        personalization: "embroidery",
      });
    },
  );
  it("conserve les séparateurs dans les cellules entre guillemets", () => {
    expect(
      parseCsv(
        'N°;client;produit;quantité;tissu;personnalisation\nTP-102;"Cuisine; atelier";Veste;2;;dtf',
      ).orders[0].client,
    ).toBe("Cuisine; atelier");
  });
  it("signale la quantité invalide plutôt que de la remplacer", () =>
    expect(
      parseCsv("n;c;p;q;t;s\nTP-101;Client;Veste;-2;;").errors,
    ).toHaveLength(1));
  it("rejette une personnalisation inconnue", () =>
    expect(
      parseCsv("n;c;p;q;t;s\nTP-101;Client;Veste;2;;sublimation").errors,
    ).toHaveLength(1));
});
