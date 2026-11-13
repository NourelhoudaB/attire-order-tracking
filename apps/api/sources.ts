import { parse } from "csv-parse/sync";
import { z } from "zod";
export const normalizedOrderSchema = z.object({
  externalId: z.string().nullable().default(null),
  ref: z.string().trim().min(1).max(100),
  client: z.string().trim().min(1).max(300),
  product: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().int().min(1).max(1000000),
  fabric: z.string().max(300).default(""),
  personalization: z.enum(["none", "embroidery", "dtf"]),
  phone: z.string().max(100).default(""),
  address: z.string().max(1000).default(""),
});
export type NormalizedOrder = z.infer<typeof normalizedOrderSchema>;
export interface OrderSource {
  fetchConfirmedOrders(since?: Date): Promise<NormalizedOrder[]>;
}
export function parseCsv(text: string) {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] ?? "";
  const delimiter = [";", ",", "\t"].sort(
    (a, b) => first.split(b).length - first.split(a).length,
  )[0];
  const rows = parse(text, {
    delimiter,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];
  return normalizeRows(rows);
}
export function normalizeRows(rows: unknown[][]) {
  if (rows.length > 5001) throw new Error("Import limité à 5 000 commandes.");
  const errors: string[] = [];
  const orders: NormalizedOrder[] = [];
  rows.slice(1).forEach((row, i) => {
    const c = row.map((v) => String(v ?? "").trim());
    if (c.every((x) => !x)) return;
    const p = (c[5] ?? "").toLowerCase();
    if (p && !["broderie", "embroidery", "dtf", "aucune", "none"].includes(p)) {
      errors.push(`Ligne ${i + 2} : personnalisation inconnue.`);
      return;
    }
    const result = normalizedOrderSchema.safeParse({
      ref: c[0],
      client: c[1],
      product: c[2],
      quantity: c[3],
      fabric: c[4] ?? "",
      personalization: ["broderie", "embroidery"].includes(p)
        ? "embroidery"
        : p === "dtf"
          ? "dtf"
          : "none",
      phone: c[6] ?? "",
      address: c[7] ?? "",
    });
    if (result.success) orders.push(result.data);
    else
      errors.push(
        `Ligne ${i + 2} : référence, client, produit ou quantité invalide.`,
      );
  });
  return { orders, errors };
}
export class CsvSource implements OrderSource {
  constructor(private text: string) {}
  async fetchConfirmedOrders() {
    const result = parseCsv(this.text);
    if (result.errors.length) throw new Error(result.errors.join("\n"));
    return result.orders;
  }
}
// No undocumented API calls or browser scraping. API/webhook adapters await an official contract.
export class OneboardApiSource implements OrderSource {
  async fetchConfirmedOrders(): Promise<NormalizedOrder[]> {
    throw new Error(
      "Documentation de l’API Oneboard requise pour activer la synchronisation automatique.",
    );
  }
}
