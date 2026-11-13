import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  Filter,
  Layers3,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  TriangleAlert,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { api, ApiError, queryClient } from "./api";
import {
  roles,
  roleLabels,
  stepDefinitions,
  passwordRules,
  statusFor,
  sortOrders,
  type User,
  type Role,
  type Order,
  type Message,
} from "../../../packages/shared/index";
import { previewOrders, previewUser } from "./demo";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./styles.css";
const siteName = "TENUE PRO";
const siteDescription =
  "Le suivi de votre atelier de confection, du planning à la livraison.";
const dt = (s: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(s));
const nowDate = () =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).format(new Date());
const personalLabels = {
  none: "Sans personnalisation",
  embroidery: "Broderie",
  dtf: "Impression DTF",
};
const AppContext = createContext<{
  user: User;
  preview: boolean;
  notify: (s: string) => void;
  perform: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}>({} as any);
const useApp = () => useContext(AppContext);
function Logo({ large = false }: { large?: boolean }) {
  return (
    <span className={`logo ${large ? "large" : ""}`}>
      <img
        src="/img/logo-tenue-pro.png"
        srcSet="/img/logo-tenue-pro@2x.png 2x"
        alt="Tenue Pro — Just for YOU"
      />
    </span>
  );
}
function Empty({
  icon: Icon = ClipboardList,
  title,
  children,
}: {
  icon?: typeof ClipboardList;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="error" role="alert">
      <TriangleAlert size={18} />
      <span>
        {error instanceof Error ? error.message : "Une erreur est survenue."}
      </span>
    </div>
  );
}
function ThemeButton() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("tp_theme") ?? "system",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tp_theme", theme);
  }, [theme]);
  return (
    <button
      className="icon-button theme"
      aria-label={`Thème : ${theme === "system" ? "automatique" : theme === "light" ? "clair" : "sombre"}. Changer de thème`}
      title="Changer de thème"
      onClick={() =>
        setTheme(
          theme === "system" ? "light" : theme === "light" ? "dark" : "system",
        )
      }
    >
      {theme === "system" ? (
        <Monitor size={18} />
      ) : theme === "light" ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}
function PasswordField({
  label = "Mot de passe",
  value,
  onChange,
  autoComplete = "current-password",
}: {
  label?: string;
  value: string;
  onChange: (s: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={1}
          maxLength={128}
          required
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={
            show ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
function Login({
  onLogin,
  onPreview,
}: {
  onLogin: (u: User) => void;
  onPreview: () => void;
}) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api<User>("/auth/login", "POST", { username, password }),
    onSuccess: onLogin,
  });
  return (
    <div className="login-page">
      <header className="login-top">
        <a href="/" aria-label="Accueil TENUE PRO">
          <Logo />
        </a>
        <span>
          <span className="tiny-dot" /> L’ATELIER, CONNECTÉ.
        </span>
        <ThemeButton />
      </header>
      <main className="login-layout">
        <section className="login-story">
          <div className="eyebrow">
            <span /> SUIVI DE PRODUCTION
          </div>
          <h1>
            Du premier tracé
            <br />
            au dernier <em>colis.</em>
          </h1>
          <p className="lead">
            Un atelier. Plusieurs savoir-faire.
            <br />
            Une chaîne parfaitement coordonnée.
          </p>
          <div className="story-workflow">
            <div>
              <span>
                <ClipboardList size={21} />
              </span>
              <b>Planifier</b>
              <small>Organiser la journée</small>
            </div>
            <ChevronRight />
            <div>
              <span>
                <Layers3 size={21} />
              </span>
              <b>Confectionner</b>
              <small>Avancer, étape par étape</small>
            </div>
            <ChevronRight />
            <div>
              <span>
                <PackageCheck size={21} />
              </span>
              <b>Livrer</b>
              <small>Tenir ses engagements</small>
            </div>
          </div>
          <div className="story-note">
            <ShieldCheck size={19} />
            <span>
              La bonne action, par la bonne fonction.
              <br />
              <strong>La traçabilité à chaque étape.</strong>
            </span>
          </div>
          <div className="story-number" aria-hidden="true">
            01<span>—</span>11
          </div>
        </section>
        <section className="login-panel">
          <div className="login-form-head">
            <Logo large />
            <p>Suivi de chaîne · connexion par fonction</p>
          </div>
          <div className="panel-heading">
            <span className="eyebrow">VOTRE ESPACE ATELIER</span>
            <h2>Bienvenue au travail.</h2>
            <p>Connectez-vous pour retrouver votre planning.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <label>
              Identifiant
              <input
                autoComplete="username"
                placeholder="Votre identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                pattern="[a-z0-9._\-]{3,32}"
                maxLength={32}
              />
            </label>
            <PasswordField value={password} onChange={setPassword} />
            {login.isError && <ErrorBox error={login.error} />}
            <button className="primary wide" disabled={login.isPending}>
              {login.isPending ? "Connexion en cours…" : "Se connecter"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-help">
            <LockKeyhole size={14} /> Accès réservé aux comptes de l’atelier.
            <br />
            <span>
              Un problème de connexion ? Contactez votre administrateur.
            </span>
          </p>
          <div className="preview-link">
            <button onClick={onPreview}>
              Découvrir un aperçu de l’interface <ArrowUpRight size={16} />
            </button>
            <small>Données d’exemple · aucune connexion requise</small>
          </div>
        </section>
      </main>
      <footer className="login-footer">
        <span>
          {siteName}
          <span className="footer-separator">/</span> SUIVI DE CHAÎNE
        </span>
        <span>Le savoir-faire avance ensemble.</span>
      </footer>
    </div>
  );
}
function ChangePassword({
  user,
  onChanged,
}: {
  user: User;
  onChanged: (u: User) => void;
}) {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const rules = passwordRules(password, user.username, user.displayName);
  const change = useMutation({
    mutationFn: () => api<User>("/auth/change-password", "POST", { password }),
    onSuccess: onChanged,
  });
  return (
    <div className="password-page">
      <section className="login-panel">
        <Logo large />
        <h1>Choisissez votre mot de passe</h1>
        <p>
          Pour protéger votre compte, remplacez le mot de passe temporaire avant
          de continuer.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate();
          }}
        >
          <PasswordField
            label="Nouveau mot de passe"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <ul className="password-rules">
            {rules.map((r) => (
              <li key={r.label} className={r.ok ? "met" : ""}>
                <Check size={15} />
                {r.label}
              </li>
            ))}
            <li>
              <ShieldCheck size={15} /> Différent des mots de passe courants et
              des cinq derniers
            </li>
          </ul>
          <PasswordField
            label="Confirmer le mot de passe"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {confirm && confirm !== password && (
            <p className="red-text">Les mots de passe ne correspondent pas.</p>
          )}
          {change.isError && <ErrorBox error={change.error} />}
          <button
            className="primary wide"
            disabled={
              change.isPending ||
              !rules.every((r) => r.ok) ||
              password !== confirm
            }
          >
            Enregistrer et continuer <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
function Status({ order }: { order: Order }) {
  const s = statusFor(order);
  return (
    <span className={`badge ${s.color}`}>
      <span className="status-dot" />
      {s.label}
    </span>
  );
}
function Flags({ order }: { order: Order }) {
  return (
    <>
      {order.isExpress && (
        <span className="badge express">
          <Zap size={12} fill="currentColor" /> EXPRESS
        </span>
      )}
      {order.isPriority && <span className="badge priority">PRIORITAIRE</span>}
      {order.isStockout && (
        <span className="badge red">
          <TriangleAlert size={12} /> RUPTURE
          {order.stockoutNote ? ` : ${order.stockoutNote}` : ""}
        </span>
      )}
    </>
  );
}
function StepList({ order }: { order: Order }) {
  const { user, perform, preview } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <ol className="step-list">
      {order.steps.map((s, i) => {
        const def = stepDefinitions.find((d) => d.code === s.stepCode)!;
        const current = i === order.stepIndex;
        const allowed =
          current && (user.role === "admin" || user.role === s.ownerRole);
        return (
          <li
            key={s.id}
            className={`${s.doneAt ? "done" : current ? "current" : "locked"}`}
          >
            <button
              className="step-check"
              disabled={!allowed || !!s.doneAt || busy || preview}
              aria-label={`Valider : ${def.label}`}
              onClick={async () => {
                setBusy(true);
                try {
                  await perform(
                    `/orders/${order.id}/steps/current/complete`,
                    "POST",
                    { expectedStepId: s.id },
                  );
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              {s.doneAt ? (
                <Check size={23} strokeWidth={3} />
              ) : current ? (
                <span />
              ) : (
                <LockKeyhole size={16} />
              )}
            </button>
            <div>
              <strong>{def.label}</strong>
              <small>
                {s.doneAt
                  ? `Fait · ${dt(s.doneAt)} · ${roleLabels[s.doneByRole!] ?? ""}`
                  : current
                    ? allowed
                      ? `À faire · ${def.help}`
                      : `En attente · ${roleLabels[s.ownerRole]}`
                    : `Verrouillé : « ${stepDefinitions.find((d) => d.code === order.steps[i - 1]?.stepCode)?.label ?? ""} » pas encore faite`}
              </small>
            </div>
            {current && (
              <span className="step-current-label">ÉTAPE ACTUELLE</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
function OrderCard({
  order,
  alwaysOpen = false,
  children,
}: {
  order: Order;
  alwaysOpen?: boolean;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = stepDefinitions.find(
    (s) => s.code === order.steps[order.stepIndex]?.stepCode,
  );
  const status = statusFor(order);
  return (
    <article
      className={`order-card border-${order.isStockout ? "red" : status.color}`}
    >
      <button
        className="order-heading"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={alwaysOpen || expanded}
      >
        <div className="order-customer">
          <h3>{order.client}</h3>
          <p>
            <span className="order-ref">{order.ref}</span>
            <span className="middot">·</span>
            {order.product} <strong>× {order.quantity}</strong>
          </p>
          <small>
            Tissu : {order.fabric || "À renseigner"}
            {order.fabricMeters !== null
              ? ` · ${order.fabricMeters} m`
              : ""} · {personalLabels[order.personalization]}
          </small>
        </div>
        <div className="order-badges">
          <Status order={order} />
          <div>
            <Flags order={order} />
          </div>
          {!alwaysOpen && (
            <ChevronDown size={17} className={expanded ? "rotate" : ""} />
          )}
        </div>
      </button>
      {order.status !== "imported" && (
        <div className="order-progress">
          <div className="progress-track">
            <span
              style={{
                width: `${order.steps.length ? (order.stepIndex / order.steps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p>
            <span>
              Étape : <b>{def?.label ?? "Commande terminée"}</b>
            </span>
            <span className="progress-counter">
              {order.stepIndex}
              <span>/{order.steps.length}</span>
            </span>
          </p>
          {def && <small>Responsable : {roleLabels[def.role]}</small>}
        </div>
      )}
      {(alwaysOpen || expanded) && order.steps.length > 0 && (
        <StepList order={order} />
      )}
      {children}
    </article>
  );
}
function Metrics({ orders }: { orders: Order[] }) {
  const planned = orders.filter((o) => o.status === "planned");
  const values = [
    {
      label: "Au planning",
      n: planned.length,
      icon: ClipboardList,
      color: "red",
      caption: "commandes en production",
    },
    {
      label: "À planifier",
      n: orders.filter((o) => o.status === "imported").length,
      icon: CalendarDays,
      color: "orange",
      caption: "commandes en attente",
    },
    {
      label: "Prêtes à livrer",
      n: planned.filter((o) => o.steps[o.stepIndex]?.stepCode === "livraison")
        .length,
      icon: PackageCheck,
      color: "green",
      caption: "dernière étape à valider",
    },
    {
      label: "En rupture",
      n: orders.filter((o) => o.isStockout).length,
      icon: TriangleAlert,
      color: "red",
      caption: "besoins à débloquer",
    },
  ];
  return (
    <div className="metrics">
      {values.map((v) => (
        <div className={`metric ${v.color}`} key={v.label}>
          <div>
            <span>{v.label}</span>
            <v.icon size={19} />
          </div>
          <strong>{String(v.n).padStart(2, "0")}</strong>
          <small>{v.caption}</small>
        </div>
      ))}
    </div>
  );
}
function Today({ orders }: { orders: Order[] }) {
  const { user, preview, perform } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const planned = orders.filter((o) => o.status === "planned");
  const mine = planned.filter(
    (o) =>
      user.role === "admin" || o.steps[o.stepIndex]?.ownerRole === user.role,
  );
  const displayed = planned.filter(
    (o) =>
      filter === "all" ||
      (filter === "express" && o.isExpress) ||
      (filter === "priority" && o.isPriority) ||
      (filter === "ready" && o.steps[o.stepIndex]?.stepCode === "livraison"),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TABLEAU DE BORD DE L’ATELIER</div>
          <h1>
            Chaque étape compte<span className="red-text">.</span>
          </h1>
          <p className="date-line">
            <CalendarDays size={16} />
            {nowDate()}
          </p>
        </div>
        {["admin", "manager"].includes(user.role) && (
          <button className="primary" onClick={() => navigate("/planning")}>
            <Plus size={18} /> Préparer le planning
          </button>
        )}
      </div>
      <Metrics orders={orders} />
      <section className="action-section">
        <div className="section-title">
          <h2>
            <Zap size={20} /> À faire maintenant{" "}
            <span className="muted">· {roleLabels[user.role]}</span>
          </h2>
          <span className="count-pill">
            {mine.length} action{mine.length > 1 ? "s" : ""}
          </span>
        </div>
        {mine.length ? (
          <div className="action-grid">
            {mine.map((o) => {
              const def = stepDefinitions.find(
                (s) => s.code === o.steps[o.stepIndex]?.stepCode,
              )!;
              return (
                <div className="action-card" key={o.id}>
                  <div className="action-card-top">
                    <span className="action-kicker">À VOUS DE JOUER</span>
                    {o.isExpress && (
                      <span className="badge express">
                        <Zap size={12} /> EXPRESS
                      </span>
                    )}
                  </div>
                  <h3>{def.label}</h3>
                  <p>
                    <b>{o.ref}</b>
                    <span className="middot">·</span>
                    {o.client}
                  </p>
                  <small>
                    {def.help} · {o.fabric}
                  </small>
                  <button
                    className="primary"
                    disabled={preview || busy === o.id}
                    onClick={async () => {
                      setBusy(o.id);
                      try {
                        await perform(
                          `/orders/${o.id}/steps/current/complete`,
                          "POST",
                          { expectedStepId: o.steps[o.stepIndex].id },
                        );
                      } catch {
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <CheckCheck size={19} />
                    {busy === o.id ? "Validation…" : "FAIT"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-actions">
            <CheckCheck size={23} />
            <div>
              <strong>Aucune action requise actuellement.</strong>
              <p>
                Votre prochaine étape apparaît ici dès qu’une commande vous est
                transmise.
              </p>
            </div>
          </div>
        )}
      </section>
      <section className="daily-section">
        <div className="section-title">
          <h2>
            <ClipboardList size={20} /> Planning du jour{" "}
            <span className="count-pill">{planned.length}</span>
          </h2>
          <span className="muted desktop-only">
            Express, prioritaires, puis ordre d’arrivée
          </span>
        </div>
        <div className="filter-bar">
          {[
            ["all", "Toutes"],
            ["express", "Express"],
            ["priority", "Prioritaires"],
            ["ready", "Prêtes à livrer"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`filter-chip ${filter === k ? "selected" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k === "express" && <Zap size={14} />} {label}
            </button>
          ))}
          <span className="filter-info">
            <Filter size={14} /> {displayed.length} commande
            {displayed.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="order-list">
          {displayed.length ? (
            displayed.map((o) => <OrderCard key={o.id} order={o} alwaysOpen />)
          ) : (
            <Empty
              title={
                filter === "all"
                  ? "Le planning attend ses premières commandes."
                  : "Aucune commande dans ce filtre."
              }
            >
              {["admin", "manager"].includes(user.role)
                ? "Importez les commandes confirmées et ajoutez-les au planning."
                : "Les commandes préparées par le manager apparaissent ici."}
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="icon-button modal-close" aria-label="Fermer">
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function ImportModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const { perform, notify } = useApp();
  const [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Importer les commandes"
      description="Importez les commandes confirmées depuis un export Oneboard."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            let body: unknown = { text };
            if (file) {
              if (/\.xlsx$/i.test(file.name)) {
                const bytes = new Uint8Array(await file.arrayBuffer());
                let binary = "";
                bytes.forEach((b) => (binary += String.fromCharCode(b)));
                body = { xlsx: btoa(binary) };
              } else body = { text: await file.text() };
            }
            const result = (await perform(
              "/orders/import-csv",
              "POST",
              body,
            )) as { created: number; skipped: number } | undefined;
            if (result) {
              notify(
                `${result.created} commande(s) importée(s) · ${result.skipped} doublon(s) ignoré(s).`,
              );
              setOpen(false);
              setText("");
              setFile(null);
            }
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="upload-zone">
          <Upload size={27} />
          <strong>{file ? file.name : "Choisir un fichier"}</strong>
          <small>CSV, TXT ou Excel (.xlsx) · 5 Mo maximum</small>
          <input
            type="file"
            accept=".csv,.txt,.xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5_000_000) {
                setError(new Error("Le fichier dépasse 5 Mo."));
                return;
              }
              setError(null);
              setFile(f);
            }}
          />
        </label>
        <div className="or-divider">ou coller un export</div>
        <label>
          Contenu CSV
          <textarea
            rows={6}
            value={text}
            disabled={!!file}
            placeholder={
              "N° commande;client;produit;quantité;tissu;personnalisation\n"
            }
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="field-help">
          La première ligne contient les en-têtes. Séparateurs : point-virgule,
          virgule ou tabulation. Colonnes supplémentaires facultatives :
          téléphone, adresse.
        </p>
        {error != null && <ErrorBox error={error} />}
        <button
          className="primary wide"
          disabled={busy || (!file && !text.trim())}
        >
          <ArrowDownToLine size={18} />
          {busy ? "Import en cours…" : "Importer les commandes"}
        </button>
      </form>
    </Modal>
  );
}
function PlanEditor({ order }: { order: Order }) {
  const { perform, preview } = useApp();
  const [fabric, setFabric] = useState(order.fabric),
    [meters, setMeters] = useState(order.fabricMeters?.toString() ?? ""),
    [personal, setPersonal] = useState(order.personalization),
    [priority, setPriority] = useState(order.isPriority),
    [express, setExpress] = useState(order.isExpress),
    [stockout, setStockout] = useState(order.isStockout),
    [note, setNote] = useState(order.stockoutNote),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save(plan = false) {
    setBusy(true);
    setError(null);
    try {
      if (plan && !fabric.trim())
        throw new Error("Indiquez le tissu à utiliser.");
      await perform(`/orders/${order.id}`, "PATCH", {
        fabric,
        fabricMeters: meters ? Number(meters) : null,
        personalization: personal,
        isPriority: priority,
        isExpress: express,
        isStockout: stockout,
        stockoutNote: note,
      });
      if (plan) await perform(`/orders/${order.id}/plan`, "POST", {});
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="plan-editor">
      <div className="form-grid">
        <label>
          Tissu à utiliser
          <input
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="Ex. gabardine blanche"
            maxLength={300}
          />
        </label>
        <label>
          Métrage (m)
          <input
            type="number"
            min="0"
            step="0.1"
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
          />
        </label>
        <label>
          Personnalisation
          <select
            value={personal}
            onChange={(e) => setPersonal(e.target.value as any)}
          >
            {Object.entries(personalLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={priority}
            onChange={(e) => setPriority(e.target.checked)}
          />
          Prioritaire
        </label>
        <label>
          <input
            type="checkbox"
            checked={express}
            onChange={(e) => setExpress(e.target.checked)}
          />
          <Zap size={15} /> Chaîne express
        </label>
        <label className="red-text">
          <input
            type="checkbox"
            checked={stockout}
            onChange={(e) => setStockout(e.target.checked)}
          />
          Rupture de stock
        </label>
      </div>
      {stockout && (
        <label>
          Ce qui manque en stock
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. tissu gabardine blanc, 12 m"
            maxLength={500}
          />
        </label>
      )}
      {error != null && <ErrorBox error={error} />}
      <div className="editor-actions">
        <button
          className="secondary"
          disabled={busy || preview}
          onClick={() => save()}
        >
          Enregistrer
        </button>
        <button
          className="primary"
          disabled={busy || preview}
          onClick={() => save(true)}
        >
          <Plus size={17} />
          Ajouter au planning du jour
        </button>
      </div>
    </div>
  );
}
function Planning({ orders }: { orders: Order[] }) {
  const { perform, preview, notify } = useApp();
  const [importOpen, setImportOpen] = useState(false);
  const imported = orders.filter((o) => o.status === "imported"),
    notStarted = orders.filter(
      (o) => o.status === "planned" && o.stepIndex === 0,
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ORGANISATION DE LA PRODUCTION</div>
          <h1>
            Préparer le planning<span className="red-text">.</span>
          </h1>
          <p>Les bonnes commandes, dans le bon ordre.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            preview
              ? notify("Connectez-vous pour importer des commandes.")
              : setImportOpen(true)
          }
        >
          <Upload size={17} />
          Importer des commandes
        </button>
      </div>
      <div className="integration-banner">
        <span className="integration-icon">
          <FileSpreadsheet size={23} />
        </span>
        <div>
          <strong>Vos commandes, depuis Oneboard</strong>
          <p>
            Import CSV, TXT et Excel disponible. Connexion automatique en
            attente de documentation API.
          </p>
        </div>
        <button
          className="secondary"
          disabled={preview}
          onClick={() => perform("/sync/oneboard", "POST", {}).catch(() => {})}
        >
          <RefreshCw size={16} />
          Synchroniser
        </button>
      </div>
      <div className="section-title">
        <h2>
          Commandes à planifier{" "}
          <span className="count-pill">{imported.length}</span>
        </h2>
        <span className="muted desktop-only">
          Le tissu est obligatoire pour planifier
        </span>
      </div>
      <div className="order-list">
        {imported.length ? (
          imported.map((o) => (
            <OrderCard key={o.id} order={o}>
              <PlanEditor order={o} />
            </OrderCard>
          ))
        ) : (
          <Empty icon={FileSpreadsheet} title="Aucune commande à planifier.">
            Importez un export des commandes confirmées depuis Oneboard.
          </Empty>
        )}
      </div>
      <div className="section-title spaced">
        <h2>
          Au planning, pas encore démarrées{" "}
          <span className="count-pill">{notStarted.length}</span>
        </h2>
      </div>
      <div className="order-list">
        {notStarted.length ? (
          notStarted.map((o) => (
            <OrderCard key={o.id} order={o}>
              <div className="editor-actions">
                <button
                  className="danger"
                  disabled={preview}
                  onClick={() =>
                    perform(`/orders/${o.id}/unplan`, "POST", {}).catch(
                      () => {},
                    )
                  }
                >
                  Retirer du planning
                </button>
              </div>
            </OrderCard>
          ))
        ) : (
          <p className="muted">Aucune commande en attente de démarrage.</p>
        )}
      </div>
      <ImportModal open={importOpen} setOpen={setImportOpen} />
    </>
  );
}
function Tracking({ orders }: { orders: Order[] }) {
  const { preview } = useApp();
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    const id = setTimeout(() => setQ(search), 250);
    return () => clearTimeout(id);
  }, [search]);
  const result = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<Order[]>(`/orders?q=${encodeURIComponent(q)}`),
    enabled: !preview && !!q,
  });
  const base = preview
    ? orders.filter((o) =>
        `${o.ref} ${o.client} ${o.phone}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : q
      ? (result.data ?? [])
      : orders;
  const displayed = [...base]
    .filter((o) => filter === "all" || o.status === filter)
    .sort(
      (a, b) =>
        Number(b.isExpress) - Number(a.isExpress) ||
        Number(b.isPriority) - Number(a.isPriority) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UNE VUE SUR CHAQUE COMMANDE</div>
          <h1>
            Suivi des commandes<span className="red-text">.</span>
          </h1>
          <p>Retrouvez l’avancement, du tracé à la livraison.</p>
        </div>
        <span className="subtle-tag">
          <Search size={16} />
          {orders.length} commandes
        </span>
      </div>
      <label className="search-field">
        <Search size={22} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="N° de commande, client ou téléphone…"
          aria-label="Rechercher par numéro de commande, client ou téléphone"
        />
      </label>
      <div className="filter-bar">
        {[
          ["all", "Toutes"],
          ["imported", "À planifier"],
          ["planned", "En cours"],
          ["delivered", "Livrées"],
        ].map(([v, l]) => (
          <button
            className={`filter-chip ${filter === v ? "selected" : ""}`}
            key={v}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {result.isError ? (
        <ErrorBox error={result.error} />
      ) : q && result.isFetching && !preview ? (
        <div className="skeleton" />
      ) : (
        <div className="order-list">
          {displayed.length ? (
            displayed.map((o) => <OrderCard key={o.id} order={o} />)
          ) : (
            <Empty icon={Search} title="Aucune commande trouvée.">
              Essayez une autre référence, un nom de client ou un téléphone.
            </Empty>
          )}
        </div>
      )}
    </>
  );
}
function Messages({ messages: items }: { messages: Message[] }) {
  const { user, preview, perform, notify } = useApp();
  const [toRole, setToRole] = useState<Role | "all">("all"),
    [orderRef, setOrderRef] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("all");
  const unread = items
    .filter((m) => !m.read)
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    if (!preview && unread)
      api("/messages/read", "POST", { ids: unread.split(",") })
        .then(() => queryClient.invalidateQueries({ queryKey: ["messages"] }))
        .catch(() => {});
  }, [unread, preview]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">L’ATELIER RESTE EN LIEN</div>
          <h1>
            Messages & alertes<span className="red-text">.</span>
          </h1>
          <p>La bonne information, à la bonne fonction.</p>
        </div>
        <span className="subtle-tag">
          <MessageSquare size={16} />
          {items.length} échanges
        </span>
      </div>
      <div className="messages-layout">
        {user.role !== "lect" && (
          <section className="compose-card">
            <h2>
              <Send size={19} /> Nouveau message
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await perform("/messages", "POST", {
                    toRole,
                    orderRef,
                    body,
                  });
                  setBody("");
                  setOrderRef("");
                  notify("Message envoyé.");
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                À
                <select
                  value={toRole}
                  onChange={(e) => setToRole(e.target.value as any)}
                >
                  <option value="all">Toutes les fonctions</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                N° de commande <span className="muted">(facultatif)</span>
                <input
                  placeholder="Ex. TP-1042"
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Message
                <textarea
                  rows={5}
                  placeholder="Une information à transmettre à l’atelier…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  maxLength={5000}
                />
              </label>
              <button
                className="primary wide"
                disabled={busy || preview || !body.trim()}
              >
                <Send size={17} />
                Envoyer
              </button>
            </form>
          </section>
        )}
        <section className="message-feed">
          <div className="filter-bar">
            {[
              ["all", "Tout"],
              ["alert", "Alertes"],
              ["message", "Messages"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={`filter-chip ${tab === v ? "selected" : ""}`}
                onClick={() => setTab(v)}
              >
                {l}
              </button>
            ))}
          </div>
          {items.filter((m) => tab === "all" || m.kind === tab).length ? (
            items
              .filter((m) => tab === "all" || m.kind === tab)
              .map((m) => (
                <article
                  className={`message-card ${m.kind} ${!m.read ? "unread" : ""}`}
                  key={m.id}
                >
                  <div className="message-heading">
                    <strong>
                      {m.kind === "alert" ? (
                        <>
                          <Bell size={16} /> Alerte · Système
                        </>
                      ) : (
                        <>
                          <Mail size={16} />
                          {roleLabels[m.fromRole as Role] ?? "Système"}
                        </>
                      )}
                    </strong>
                    <time>{dt(m.createdAt)}</time>
                  </div>
                  <small>
                    À : {m.toRole === "all" ? "Tous" : roleLabels[m.toRole]}
                    {m.orderRef ? ` · ${m.orderRef}` : ""}
                  </small>
                  <p>{m.body}</p>
                  {m.kind === "message" && user.role !== "lect" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setToRole(m.fromRole as Role);
                        setOrderRef(m.orderRef ?? "");
                        document
                          .querySelector<HTMLTextAreaElement>(
                            ".compose-card textarea",
                          )
                          ?.focus();
                      }}
                    >
                      Répondre <ArrowRight size={14} />
                    </button>
                  )}
                </article>
              ))
          ) : (
            <Empty icon={MessageSquare} title="Aucun échange pour le moment.">
              Les messages et les alertes destinés à votre fonction apparaissent
              ici.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(20));
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%&*-_";
  return "aA7!" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
function Administration() {
  const { preview, perform, notify, user: me } = useApp();
  const accounts = useQuery({
    queryKey: ["users"],
    queryFn: () => api<User[]>("/users"),
    enabled: !preview,
  });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api<any[]>("/audit"),
    enabled: !preview,
  });
  const sync = useQuery({
    queryKey: ["sync"],
    queryFn: () => api<any[]>("/sync/runs"),
    enabled: !preview,
  });
  const [tab, setTab] = useState("accounts"),
    [createOpen, setCreateOpen] = useState(false),
    [resetUser, setResetUser] = useState<User | null>(null),
    [editingUser, setEditingUser] = useState<User | null>(null),
    [username, setUsername] = useState(""),
    [displayName, setDisplayName] = useState(""),
    [role, setRole] = useState<Role>("traceur"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const resetOpen = !!resetUser;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">COMPTES & TRAÇABILITÉ</div>
          <h1>
            Administration<span className="red-text">.</span>
          </h1>
          <p>Des accès maîtrisés. Un historique conservé.</p>
        </div>
        <button
          className="primary"
          disabled={preview}
          onClick={() => {
            setPassword("");
            setError(null);
            setCreateOpen(true);
          }}
        >
          <Plus size={18} />
          Créer un compte
        </button>
      </div>
      <div className="filter-bar">
        {[
          ["accounts", "Comptes"],
          ["audit", "Journal d’audit"],
          ["sync", "Synchronisations"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={`filter-chip ${tab === v ? "selected" : ""}`}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {[accounts, audit, sync].some((q) => q.isError) && (
        <ErrorBox error={accounts.error ?? audit.error ?? sync.error} />
      )}
      {tab === "accounts" && (
        <div className="accounts-list">
          {accounts.data?.map((u) => (
            <article className="account-card" key={u.id}>
              <span className="avatar">
                {u.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="account-info">
                <strong>{u.username}</strong>
                <small>
                  {roleLabels[u.role]}
                  {u.displayName ? ` · ${u.displayName}` : ""}
                </small>
                <small>
                  Dernière connexion :{" "}
                  {u.lastLoginAt ? dt(u.lastLoginAt) : "Jamais"}
                </small>
              </div>
              <span className={`badge ${u.isActive ? "green" : "orange"}`}>
                {u.isActive ? "Actif" : "Désactivé"}
              </span>
              <div className="account-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setEditingUser(u);
                    setUsername(u.username);
                    setDisplayName(u.displayName);
                    setRole(u.role);
                    setError(null);
                  }}
                >
                  Modifier
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setResetUser(u);
                    setPassword("");
                    setError(null);
                  }}
                >
                  Réinitialiser
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    perform(`/users/${u.id}/revoke-sessions`, "POST", {})
                      .then(() =>
                        notify("Toutes les sessions ont été fermées."),
                      )
                      .catch(() => {})
                  }
                >
                  Déconnecter
                </button>
                <button
                  className="danger"
                  disabled={u.id === me.id}
                  onClick={() =>
                    perform(`/users/${u.id}`, "PATCH", {
                      isActive: !u.isActive,
                    }).catch(() => {})
                  }
                >
                  {u.isActive ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </article>
          )) ?? (
            <Empty
              icon={Users}
              title="Les comptes de l’atelier apparaissent ici."
            />
          )}
        </div>
      )}
      {tab === "audit" && (
        <div className="log-list">
          {audit.data?.length ? (
            audit.data.map((a) => (
              <article key={a.id}>
                <ShieldCheck size={19} />
                <div>
                  <strong>{a.action}</strong>
                  <small>
                    {a.entity} · {a.entityId ?? "—"}
                  </small>
                </div>
                <time>{dt(a.at)}</time>
              </article>
            ))
          ) : (
            <Empty icon={ShieldCheck} title="Aucune opération enregistrée." />
          )}
        </div>
      )}
      {tab === "sync" && (
        <div className="log-list">
          {sync.data?.length ? (
            sync.data.map((s) => (
              <article key={s.id}>
                <RefreshCw size={19} />
                <div>
                  <strong>
                    {s.source === "csv" ? "Import de fichier" : "Oneboard"} ·{" "}
                    {s.created} créée(s)
                  </strong>
                  <small className={s.errors?.length ? "red-text" : ""}>
                    {s.errors?.length
                      ? s.errors.join(" · ")
                      : "Import terminé sans erreur."}
                  </small>
                </div>
                <time>{dt(s.startedAt)}</time>
              </article>
            ))
          ) : (
            <Empty icon={RefreshCw} title="Aucune synchronisation effectuée." />
          )}
        </div>
      )}
      <Modal
        open={createOpen || resetOpen || !!editingUser}
        onOpenChange={(v) => {
          if (!v) {
            setCreateOpen(false);
            setResetUser(null);
            setEditingUser(null);
            setPassword("");
          }
        }}
        title={
          editingUser
            ? `Modifier · ${editingUser.username}`
            : resetUser
              ? `Réinitialiser · ${resetUser.username}`
              : "Créer un compte"
        }
        description="Le changement du mot de passe temporaire est obligatoire à la prochaine connexion."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              if (editingUser)
                await perform(`/users/${editingUser.id}`, "PATCH", {
                  displayName,
                  role,
                });
              else if (resetUser)
                await perform(`/users/${resetUser.id}/reset-password`, "POST", {
                  password,
                });
              else
                await perform("/users", "POST", {
                  username,
                  displayName,
                  role,
                  password,
                });
              setCreateOpen(false);
              setResetUser(null);
              setEditingUser(null);
              setPassword("");
              notify("Compte enregistré.");
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {!resetUser && (
            <>
              <label>
                Identifiant
                <input
                  disabled={!!editingUser}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  pattern="[a-z0-9._\-]{3,32}"
                  minLength={3}
                  maxLength={32}
                />
              </label>
              <label>
                Fonction
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nom d’affichage <span className="muted">(facultatif)</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                />
              </label>
            </>
          )}
          {!editingUser && (
            <>
              <PasswordField
                label="Mot de passe temporaire"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="secondary"
                onClick={() => setPassword(generatePassword())}
              >
                <RefreshCw size={16} />
                Générer
              </button>
              <ul className="password-rules">
                {passwordRules(
                  password,
                  resetUser?.username ?? username,
                  resetUser?.displayName ?? displayName,
                ).map((r) => (
                  <li className={r.ok ? "met" : ""} key={r.label}>
                    <Check size={14} />
                    {r.label}
                  </li>
                ))}
              </ul>
            </>
          )}
          {error != null && <ErrorBox error={error} />}
          <button
            className="primary wide"
            disabled={
              busy ||
              (!editingUser &&
                !passwordRules(
                  password,
                  resetUser?.username ?? username,
                  resetUser?.displayName ?? displayName,
                ).every((r) => r.ok))
            }
          >
            {busy ? "Enregistrement…" : "Enregistrer le compte"}
          </button>
        </form>
      </Modal>
    </>
  );
}
function Shell({
  user,
  preview,
  onLogout,
}: {
  user: User;
  preview: boolean;
  onLogout: () => void;
}) {
  const navigate = useNavigate(),
    location = useLocation();
  const [toast, setToast] = useState(""),
    [live, setLive] = useState(false);
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<Order[]>("/orders"),
    enabled: !preview,
  });
  const messagesQuery = useQuery({
    queryKey: ["messages"],
    queryFn: () => api<Message[]>("/messages"),
    enabled: !preview,
  });
  const orders = sortOrders(preview ? previewOrders : (ordersQuery.data ?? []));
  const messages = preview
    ? [
        {
          id: "preview-msg",
          kind: "alert" as const,
          fromRole: "system" as const,
          toRole: "manager" as const,
          orderRef: "TP-1042",
          body: "⚡ EXPRESS · À vous : Confirmation trace — TP-1042 (Hôtel Le Royal)",
          createdAt: new Date().toISOString(),
          read: false,
        },
      ]
    : (messagesQuery.data ?? []);
  const unread = messages.filter((m) => !m.read).length;
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (preview) return;
    const stream = new EventSource("/api/events");
    stream.addEventListener("connected", () => setLive(true));
    stream.addEventListener("change", () => {
      setLive(true);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    });
    stream.addEventListener("expired", onLogout);
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, [preview]);
  useEffect(() => {
    if (
      ordersQuery.error instanceof ApiError &&
      ordersQuery.error.status === 401
    )
      onLogout();
  }, [ordersQuery.error]);
  async function perform(path: string, method = "POST", body?: unknown) {
    if (preview) {
      setToast("Connectez-vous pour agir sur les commandes de l’atelier.");
      throw new Error("Mode aperçu en lecture seule.");
    }
    try {
      const result = await api(path, method, body);
      await Promise.all(
        ["orders", "messages", "users", "audit", "sync", "search"].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k] }),
        ),
      );
      if (!path.includes("import-csv")) setToast("Modification enregistrée.");
      return result;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Une erreur est survenue.");
      throw e;
    }
  }
  const manager = ["manager", "admin"].includes(user.role);
  const nav = [
    { to: "/", label: "Aujourd’hui", icon: CalendarDays },
    {
      to: "/planning",
      label: "Planning",
      icon: ClipboardList,
      hidden: !manager,
    },
    { to: "/suivi", label: "Suivi", icon: Search },
    { to: "/messages", label: "Messages", icon: MessageSquare, count: unread },
    {
      to: "/administration",
      label: "Administration",
      icon: Settings2,
      hidden: user.role !== "admin",
    },
  ];
  return (
    <AppContext.Provider value={{ user, preview, notify: setToast, perform }}>
      <div className="app-shell">
        {preview && (
          <div className="preview-banner">
            <Eye size={15} />
            <span>Aperçu en lecture seule · commandes d’exemple</span>
            <button onClick={onLogout}>
              Se connecter <ArrowRight size={14} />
            </button>
          </div>
        )}
        <header className="app-header">
          <div className="header-inner">
            <a
              className="brand"
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
            >
              <Logo />
              <div>
                <b>TENUE PRO</b>
                <span>SUIVI DE CHAÎNE</span>
              </div>
            </a>
            <div className="header-right">
              <span className="live-indicator">
                {live ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
                {preview ? "aperçu" : live ? "en direct" : "reconnexion…"}
              </span>
              <button
                className="header-notifications"
                aria-label={`${unread} messages non lus`}
                onClick={() => navigate("/messages")}
              >
                <Bell size={19} />
                {unread > 0 && <span>{unread}</span>}
              </button>
              <div className="header-profile">
                <span className="profile-circle">
                  {user.role === "manager"
                    ? "M"
                    : user.username.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{roleLabels[user.role]}</strong>
                  <span>{user.displayName || "Espace atelier"}</span>
                </div>
              </div>
              <button
                className="quit-button"
                onClick={async () => {
                  if (!preview)
                    await api("/auth/logout", "POST", {}).catch(() => {});
                  onLogout();
                }}
              >
                <LogOut size={17} />
                <span>{preview ? "Connexion" : "Quitter"}</span>
              </button>
            </div>
          </div>
        </header>
        <div className="navigation">
          <nav aria-label="Navigation principale">
            {nav
              .filter((n) => !n.hidden)
              .map((n) => (
                <NavLink end={n.to === "/"} to={n.to} key={n.to}>
                  <n.icon size={17} />
                  {n.label}
                  {!!n.count && <span className="nav-count">{n.count}</span>}
                </NavLink>
              ))}
          </nav>
          <ThemeButton />
        </div>
        <main className="app-content">
          {preview && (
            <div className="preview-context">
              <span className="tiny-dot" /> ENVIRONNEMENT DE DÉMONSTRATION{" "}
              <span>Les actions de production sont désactivées.</span>
            </div>
          )}
          {ordersQuery.isError ? (
            <ErrorBox error={ordersQuery.error} />
          ) : ordersQuery.isPending && !preview ? (
            <>
              <div className="skeleton heading-skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </>
          ) : (
            <Routes>
              <Route path="/" element={<Today orders={orders} />} />
              <Route
                path="/planning"
                element={
                  manager ? (
                    <Planning orders={orders} />
                  ) : (
                    <Empty
                      icon={LockKeyhole}
                      title="Action non autorisée pour votre rôle"
                    />
                  )
                }
              />
              <Route path="/suivi" element={<Tracking orders={orders} />} />
              <Route
                path="/messages"
                element={<Messages messages={messages} />}
              />
              <Route
                path="/administration"
                element={
                  user.role === "admin" ? (
                    <Administration />
                  ) : (
                    <Empty
                      icon={LockKeyhole}
                      title="Action non autorisée pour votre rôle"
                    />
                  )
                }
              />
              <Route
                path="*"
                element={
                  <Empty title="Page introuvable.">
                    <a href="/">Revenir au tableau de bord</a>
                  </Empty>
                }
              />
            </Routes>
          )}
          {messagesQuery.isError && <ErrorBox error={messagesQuery.error} />}
        </main>
        <footer className="app-footer">
          <span>
            <span className="tiny-dot" /> TENUE PRO{" "}
            <span className="footer-separator">/</span> L’atelier avance
            ensemble.
          </span>
          <span>
            <ShieldCheck size={14} /> Chaque étape est tracée.
          </span>
        </footer>
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button
              onClick={() => setToast("")}
              aria-label="Fermer la notification"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [preview, setPreview] = useState(false),
    [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    document.title = `${siteName} · Suivi de chaîne`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", siteDescription);
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  function exit() {
    setUser(null);
    setPreview(false);
    queryClient.clear();
    navigate("/");
  }
  if (loading)
    return (
      <div className="initial-loading">
        <Logo large />
        <span>Ouverture de l’atelier…</span>
      </div>
    );
  if (!user && !preview)
    return (
      <Login
        onLogin={(u) => {
          queryClient.clear();
          setUser(u);
          navigate("/");
        }}
        onPreview={() => {
          setPreview(true);
          navigate("/");
        }}
      />
    );
  if (user?.mustChangePassword)
    return <ChangePassword user={user} onChanged={setUser} />;
  return (
    <Shell
      user={preview ? previewUser : user!}
      preview={preview}
      onLogout={exit}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
