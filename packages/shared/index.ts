import { z } from "zod";
import commonPasswords from "./common-passwords.json";
export const roles = [
  "admin",
  "manager",
  "traceur",
  "magasin",
  "coupe",
  "etiq",
  "chaine",
  "broderie",
  "graphiste",
  "dtf",
  "emb",
  "liv",
  "lect",
] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  admin: "Administrateur",
  manager: "Manager",
  traceur: "Traceur",
  magasin: "Magasin tissu",
  coupe: "Coupe",
  etiq: "Étiquetage",
  chaine: "Chaîne de confection",
  broderie: "Broderie",
  graphiste: "Graphiste logo",
  dtf: "Impression DTF",
  emb: "Emballage",
  liv: "Livraison",
  lect: "Consultation",
};
export const stepDefinitions = [
  {
    code: "trace",
    label: "Sortie trace",
    role: "traceur",
    help: "Sortir le tracé",
  },
  {
    code: "confirmation",
    label: "Confirmation trace",
    role: "manager",
    help: "Confirmer le tracé",
  },
  {
    code: "tissu",
    label: "Sortie tissu",
    role: "magasin",
    help: "Sortir le tissu à utiliser",
  },
  { code: "coupe", label: "Coupe", role: "coupe", help: "Couper" },
  {
    code: "etiq",
    label: "Étiquetage",
    role: "etiq",
    help: "Étiqueter les pièces",
  },
  {
    code: "confection",
    label: "Confection",
    role: "chaine",
    help: "Confection en chaîne",
  },
  {
    code: "broderie",
    label: "Broderie faite",
    role: "broderie",
    help: "Broderie à réaliser",
  },
  {
    code: "logo",
    label: "Sortie logo",
    role: "graphiste",
    help: "Sortir le logo",
  },
  {
    code: "dtf",
    label: "Logo imprimé",
    role: "dtf",
    help: "Imprimer le logo en DTF",
  },
  { code: "emballage", label: "Emballage", role: "emb", help: "Emballer" },
  {
    code: "livraison",
    label: "Sortie à livrer",
    role: "liv",
    help: "Sortir pour livraison",
  },
] as const;
export type Personalization = "none" | "embroidery" | "dtf";
export function generateSteps(personalization: Personalization) {
  return stepDefinitions.filter((s) =>
    s.code === "broderie"
      ? personalization === "embroidery"
      : ["logo", "dtf"].includes(s.code)
        ? personalization === "dtf"
        : true,
  );
}
export function canComplete(
  role: Role,
  owner: Role,
  current: number,
  position: number,
) {
  return current === position && (role === "admin" || role === owner);
}
export const usernameSchema = z
  .string()
  .regex(
    /^[a-z0-9._-]{3,32}$/,
    "Identifiant : 3 à 32 lettres minuscules, chiffres, points, tirets ou underscores.",
  );
export const personalizationSchema = z.enum(["none", "embroidery", "dtf"]);
export const orderPatchSchema = z
  .object({
    fabric: z.string().max(300).optional(),
    fabricMeters: z.number().min(0).max(100000).nullable().optional(),
    personalization: personalizationSchema.optional(),
    isPriority: z.boolean().optional(),
    isExpress: z.boolean().optional(),
    isStockout: z.boolean().optional(),
    stockoutNote: z.string().max(500).optional(),
  })
  .strict();
export function passwordRules(
  password: string,
  username = "",
  displayName = "",
) {
  const p = password.toLowerCase();
  return [
    {
      label: "Absent des 1 000 mots de passe les plus courants",
      ok: !commonPasswords.includes(p),
    },
    {
      label: "12 à 128 caractères",
      ok: password.length >= 12 && password.length <= 128,
    },
    {
      label: "Une minuscule et une majuscule",
      ok: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: "Un chiffre et un symbole",
      ok: /\d/.test(password) && /[^a-zA-Z0-9\s]/.test(password),
    },
    {
      label: "Sans identifiant ni nom d’affichage",
      ok: ![username, displayName]
        .filter(Boolean)
        .some((n) => p.includes(n.toLowerCase())),
    },
    {
      label: "Pas de caractère répété trois fois",
      ok: !/(.)\1\1/u.test(password),
    },
  ];
}
export function sortOrders<
  T extends {
    isExpress: boolean;
    isPriority: boolean;
    createdAt: string | Date;
  },
>(orders: T[]) {
  return [...orders].sort(
    (a, b) =>
      Number(b.isExpress) - Number(a.isExpress) ||
      Number(b.isPriority) - Number(a.isPriority) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
};
export type Step = {
  id: string;
  position: number;
  stepCode: string;
  ownerRole: Role;
  doneAt: string | null;
  doneByRole: Role | null;
  doneByUserId: string | null;
};
export type Order = {
  id: string;
  ref: string;
  client: string;
  phone: string;
  address: string;
  product: string;
  quantity: number;
  fabric: string;
  fabricMeters: number | null;
  personalization: Personalization;
  status: "imported" | "planned" | "delivered";
  isPriority: boolean;
  isExpress: boolean;
  isStockout: boolean;
  stockoutNote: string;
  plannedDate: string | null;
  stepIndex: number;
  createdAt: string;
  steps: Step[];
};
export type Message = {
  id: string;
  kind: "alert" | "message";
  fromRole: Role | "system";
  toRole: Role | "all";
  orderRef: string | null;
  body: string;
  createdAt: string;
  read: boolean;
};
export function statusFor(o: Order) {
  return o.status === "delivered"
    ? { label: "LIVRÉE", color: "green" }
    : o.status === "imported"
      ? { label: "À PLANIFIER", color: "orange" }
      : o.steps[o.stepIndex]?.stepCode === "livraison"
        ? { label: "PRÊTE À LIVRER", color: "green" }
        : { label: "EN COURS", color: "blue" };
}
