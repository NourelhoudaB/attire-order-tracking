import {
  generateSteps,
  type Order,
  type User,
} from "../../../packages/shared/index";
export const previewUser: User = {
  id: "preview",
  username: "manager",
  displayName: "",
  role: "manager",
  mustChangePassword: false,
  isActive: true,
  lastLoginAt: null,
};
const definitions: Array<
  Partial<Order> &
    Pick<
      Order,
      | "ref"
      | "client"
      | "product"
      | "quantity"
      | "fabric"
      | "fabricMeters"
      | "personalization"
      | "stepIndex"
    >
> = [
  {
    ref: "TP-1042",
    client: "Hôtel Le Royal",
    product: "Veste de cuisine",
    quantity: 24,
    fabric: "Gabardine blanche",
    fabricMeters: 38.4,
    personalization: "embroidery",
    stepIndex: 1,
    isExpress: true,
  },
  {
    ref: "TP-1038",
    client: "Maison Ben Yedder",
    product: "Tablier de service",
    quantity: 48,
    fabric: "Sergé noir",
    fabricMeters: 42,
    personalization: "dtf",
    stepIndex: 3,
    isPriority: true,
  },
  {
    ref: "TP-1035",
    client: "Clinique Jasmin",
    product: "Tunique médicale",
    quantity: 36,
    fabric: "Polycoton bleu ciel",
    fabricMeters: 54,
    personalization: "none",
    stepIndex: 7,
  },
  {
    ref: "TP-1045",
    client: "Restaurant La Verrière",
    product: "Polo de service",
    quantity: 18,
    fabric: "Piqué de coton écru",
    fabricMeters: 21.6,
    personalization: "embroidery",
    stepIndex: 0,
  },
  {
    ref: "TP-1047",
    client: "Atelier Nord",
    product: "Pantalon de travail",
    quantity: 30,
    fabric: "Gabardine anthracite",
    fabricMeters: null,
    personalization: "none",
    stepIndex: 0,
    status: "imported",
    isStockout: true,
    stockoutNote: "Gabardine anthracite, 45 m",
  },
];
export const previewOrders: Order[] = definitions.map((d, i) => ({
  id: `preview-${i}`,
  phone: "",
  address: "",
  status: "planned",
  isExpress: false,
  isPriority: false,
  isStockout: false,
  stockoutNote: "",
  ...d,
  plannedDate: new Date().toLocaleDateString("en-CA"),
  createdAt: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
  steps:
    d.status === "imported"
      ? []
      : generateSteps(d.personalization).map((s, p) => ({
          id: `preview-${i}-${p}`,
          position: p,
          stepCode: s.code,
          ownerRole: s.role,
          doneAt: p < d.stepIndex ? new Date().toISOString() : null,
          doneByUserId: null,
          doneByRole: p < d.stepIndex ? s.role : null,
        })),
})) as Order[];
