# TENUE PRO

Application de suivi de confection en français, déployée sur Netlify. Lire README.md pour les limites et les procédures opérationnelles.

## Répartition

- `apps/web/` : SPA React 18 + Vite, styles CSS avec tokens de marque, Tailwind, Radix Dialog, React Router et TanStack Query. Entrée `src/main.tsx` ; la feuille CSS gère les écrans et les thèmes.
- `apps/api/index.ts` : routes Fastify du Netlify Server, compilées par esbuild vers l’unique entrée `netlify/server/index.mjs`. Ce fichier généré n’est pas à modifier manuellement.
- `apps/api/security.ts` : sessions opaques, argon2id, politique de mots de passe, autorisations et audits.
- `netlify/functions/accounts.mts` : opérations Identity exécutées ici parce que les mutations serveur du SDK demandent un contexte Functions. Le reste du backend reste sur le Server.
- `netlify/functions/identity.mts` : refuse l’inscription libre.
- `netlify/functions/daily-backup.mts` : archive métier quotidienne, privée, sans identifiants d’authentification ; ce n’est pas un dump complet.
- `packages/shared/` : constantes et types communs, liste embarquée de 1 000 mots de passe courants (source SecLists, voir README).
- `db/schema.ts` et `netlify/database/migrations/` : source Drizzle et migrations de la plateforme.
- `tests/` : Vitest et scénarios Playwright, dont un parcours nécessitant un compte de test configuré.

## Conventions

TypeScript et imports ESM avec extensions `.js` dans le backend. Champs en camelCase dans les types/API et snake_case dans PostgreSQL. Toute mutation métier doit être autorisée côté serveur, validée par Zod, et auditée si elle modifie un compte ou une commande. Les opérations d’étape, planification et retrait verrouillent la commande dans une transaction. Ne pas modifier les étapes déjà faites ; ne pas sauter une étape express. Maintenir l’alerte et la transition dans la même transaction.

Ne jamais utiliser l’état React, la mémoire du Server ou des fichiers locaux pour persister des données de l’atelier. Netlify Database porte l’état ; Blobs porte uniquement les archives. Les données `src/demo.ts` sont des exemples publics figés, en lecture seule, explicitement séparés des API et jamais injectés en base.

Le front n’utilise pas de JWT dans localStorage. Seule la préférence de thème y est conservée. Ne jamais journaliser ni committer de secrets. Les jetons Identity serveur sont supprimés des cookies de réponse ; les API métier utilisent uniquement `tp_session` avec HttpOnly/Secure/Lax et un condensat du jeton en base. Les rôles et l’activation proviennent exclusivement de la table users.

Les routes SPA connues ont des réécritures individuelles. Ne pas ajouter de réécriture globale vers index.html : elle intercepterait `/api/*`. Le Server reçoit `/api/*`, les Functions de comptes ont leurs chemins spécifiques. Les contenus métier ne sont pas mis en cache dans la PWA.

## Oneboard

Aucun connecteur automatique n’est implémenté sans documentation officielle. Ne pas réutiliser les informations confidentielles de la conversation. Aucun scraping. Le contrat `OrderSource` et l’import CSV servent de point d’intégration ; la route de synchronisation renvoie explicitement 501. Ajouter un job de cinq minutes seulement après disponibilité d’un adaptateur documenté ; utiliser une fonction planifiée, pas un timer qui garde le Server actif.

## Développement

`npm run build` compile front et Server ; `npm run db:generate -- --name nom_descriptif` génère une migration. Ne jamais appliquer les migrations manuellement : la plateforme s’en charge. `netlify dev --port 8889` sert l’environnement local ; vérifier Identity sur un Deploy Preview. `npm test` et `npm run test:e2e` sont disponibles. Les scénarios métier créent des données et doivent cibler une branche de test isolée. Ne pas prétendre que les tests passent sans les avoir exécutés.
