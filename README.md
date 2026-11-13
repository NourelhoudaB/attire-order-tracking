# TENUE PRO · Suivi de chaîne

Application en français pour suivre les commandes confirmées d’un atelier de confection : import, planning, checklist séquentielle, livraison et messages par fonction. L’affichage s’adapte aux téléphones, tablettes et ordinateurs ; les modes clair, sombre et automatique sont disponibles. Le logo fourni et les polices Barlow sont servis localement.

## Architecture et déploiement

Le projet utilise TypeScript, React 18, Vite, React Router, TanStack Query, Tailwind CSS, Radix Dialog, Fastify, Zod, PostgreSQL via Netlify Database et Drizzle ORM. Le déploiement cible Netlify, avec Node.js 24, HTTPS géré par la plateforme et migrations appliquées automatiquement avant publication. Cette cible remplace les conteneurs web/api/db et Node.js 20 du cahier des charges. `docker-compose.yml` fournit seulement un client PostgreSQL facultatif pour les sauvegardes complètes ; il ne déploie pas l’application.

`apps/web` contient le front. `apps/api` contient les routes métier Fastify du Netlify Server. `packages/shared` partage les rôles, étapes, types et validations. `db/schema.ts` est la source du schéma ; les migrations sont versionnées dans `netlify/database/migrations`.

Les opérations de comptes utilisent `@netlify/identity` dans `netlify/functions/accounts.mts` : le SDK exige ce contexte pour ses opérations administratives et ses cookies serveur. Le reste des API est servi par le Netlify Server. Les routes d’authentification sont ciblées explicitement, sans intercepter les routes métier.

## Démarrage local

Prérequis : Node.js 24 et Netlify CLI. Le projet doit être lié à son site Netlify pour les services de données.

```sh
npm install
npm run build
netlify dev --port 8889
```

Le port 8889 est l’entrée locale. La base et les fonctions sont gérées par Netlify ; Identity n’est pas émulé localement. Utiliser un Deploy Preview pour vérifier la connexion et les comptes. Pour modifier seulement le front, `npm run dev` démarre Vite ; les appels API nécessitent toujours les services Netlify. L’aperçu public contient uniquement des exemples figés, sans écriture ni accès aux données de production.

## Administrateur initial

`ADMIN_USERNAME` et `ADMIN_INITIAL_PASSWORD` sont fournis par la configuration sécurisée de l’environnement, jamais par un fichier du dépôt. L’identifiant suit la règle de 3 à 32 caractères minuscules. Le mot de passe respecte la politique de sécurité et ne contient pas l’identifiant.

Le premier accès avec ces valeurs initialise l’unique administrateur de départ si la table des comptes est vide. Le script suivant permet également cette initialisation, avec les mêmes variables déjà disponibles dans l’environnement du processus et `APP_URL` correspondant à la cible HTTPS :

```sh
npm run seed
```

Le script n’affiche aucune donnée de connexion. Le changement de mot de passe est obligatoire avant tout accès métier. Une fois un compte présent, la voie d’initialisation est désactivée. Les comptes suivants sont créés depuis Administration, avec changement obligatoire du mot de passe temporaire. L’inscription libre est refusée par l’événement de validation Identity.

Identity gère le compte d’identité ; PostgreSQL porte l’autorité des fonctions et de l’activation. Un hachage argon2id applicatif est conservé avec l’historique des cinq derniers mots de passe. Aucun jeton Identity n’est envoyé au front. Les API métier utilisent une session opaque de 12 heures : seul son condensat SHA-256 est stocké, cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Les sessions sont renouvelées à l’activité HTTP, révoquées à la réinitialisation ou à la modification d’un compte. La limitation des échecs par identifiant et IP est persistante en base.

## Import et Oneboard

Dans Planning, importer un fichier CSV/TXT/Excel `.xlsx` ou coller un export. Première ligne : en-têtes. Colonnes, dans cet ordre : numéro, client, produit, quantité, tissu, personnalisation (`broderie`, `dtf` ou vide). Téléphone et adresse peuvent suivre. Séparateurs CSV : `;`, `,`, tabulation ; cellules entre guillemets acceptées. Maximum : 5 Mo et 5 000 lignes. Un export contenant une ligne invalide est refusé intégralement. Les références et identifiants externes sont uniques ; réimporter un export existant ne crée pas de doublons. Les imports et leurs erreurs sont visibles dans Administration.

Le contrat `OrderSource` et `CsvSource` sont disponibles. **La récupération automatique Oneboard, l’API et les webhooks ne sont pas activés** : une documentation officielle de l’authentification, de l’endpoint des commandes et du format des réponses est nécessaire. La route `/api/sync/oneboard` explique cette indisponibilité et trace la tentative. Aucun accès au site Oneboard par scraping, aucune utilisation des identifiants communiqués et aucun secret Oneboard dans le dépôt. Aucun job factice n’est exécuté toutes les cinq minutes ; la tâche de synchronisation sera ajoutée une fois l’adaptateur documenté.

## Garanties métier

Une commande est modifiable seulement avant planification. Le tissu est obligatoire, une rupture bloque la planification, l’express ne saute aucune étape. Les étapes de personnalisation inexistantes sont retirées du parcours. Les changements d’étape verrouillent la commande dans une transaction PostgreSQL, contrôlent le rôle côté serveur et exigent l’identifiant de l’étape attendue pour empêcher deux validations concurrentes. Toute validation est définitive ; date, utilisateur et rôle sont conservés.

Les alertes sont enregistrées dans la même transaction que la transition. Le flux SSE vérifie périodiquement la session et les changements persistants, toutes les 2,5 secondes ; il fonctionne entre instances sans bus de messages en mémoire. Le navigateur se reconnecte automatiquement. Les messages sont filtrés par destinataire ; les lectures sont propres à chaque utilisateur. Les administrateurs voient tous les échanges. La consultation ne permet pas l’envoi.

Les opérations d’écriture exigent un `Origin` autorisé et l’en-tête `X-Tenue-Pro: 1`. La protection de rôle s’applique aussi aux appels directs. Les journaux n’enregistrent ni mots de passe ni corps de requêtes de connexion. Les en-têtes CSP, HSTS et protections MIME sont configurés.

## API

Préfixe `/api`. Réponses d’erreur : `{ "error": { "code": "…", "message": "…" } }`. Les routes métier sont documentées automatiquement par Fastify, accessibles à l’administrateur sur `GET /api/openapi.json`. Les opérations de comptes sont détaillées dans [docs/API.md](docs/API.md).

## Migrations

Après modification de `db/schema.ts` :

```sh
npm run db:generate -- --name add_descriptive_change
```

Les migrations sont appliquées par la plateforme au déploiement. Ne pas exécuter `drizzle-kit push` ou modifier une migration déjà appliquée.

## Sauvegardes

Une fonction planifiée à 02:00 UTC crée chaque jour une archive JSON cohérente des commandes, étapes, messages, lectures, audits et synchronisations, dans le stockage privé Netlify Blobs `tenue-pro-workflow-backups`. Conservation : 30 jours. **Il s’agit d’une sauvegarde métier, pas d’un dump PostgreSQL complet** : elle exclut sessions, mots de passe et hachages. Les comptes d’identité ne sont pas restaurables depuis cette archive ; ils nécessitent une procédure séparée de recréation/réinitialisation. La fonction planifiée s’exécute uniquement sur les déploiements publiés. Une restauration doit être préparée et vérifiée sur une branche de base isolée avant production.

Pour un dump complet, `scripts/backup.sh` utilise `pg_dump`, avec les paramètres de connexion déjà fournis par les variables libpq `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` et `PGSSLMODE=require`. Ne pas écrire ces valeurs dans des fichiers du dépôt ou des arguments de commande. Sur un hôte d’exploitation équipé de PostgreSQL client :

```sh
./scripts/backup.sh
# ou avec le client conteneurisé, en héritant des variables de l’environnement :
docker compose --profile operations run --rm backup
```

Le dump complet doit être conservé dans un stockage sécurisé extérieur au dépôt. Il contient les données d’authentification applicatives ; sa protection et sa restauration relèvent de l’exploitation. Le script est fourni ; son exécution quotidienne par un hôte externe n’est pas configurée ici.

## Vérification

```sh
npm test
E2E_BASE_URL=https://votre-preview.netlify.app npm run test:e2e
```

Vitest couvre les parcours conditionnels, les droits, les mots de passe, le tri et le parsing des exports. Playwright prévoit les formats 390, 820 et 1280 px en clair/sombre, la recherche, la séparation aperçu/production et le refus sans session. Le scénario métier utilise `E2E_ADMIN_USERNAME` et `E2E_ADMIN_PASSWORD` d’un compte administrateur de test dont le mot de passe a déjà été changé ; il crée des comptes et des commandes isolés avec références uniques. Les traces de ce scénario sont désactivées pour ne pas capturer les mots de passe. Ne pas utiliser ce scénario sur la production.

Les tests ont été ajoutés mais n’ont pas été exécutés pendant la création ; la compilation est confiée au pipeline de déploiement. Les notifications Web Push, le fonctionnement hors ligne avec modification des commandes, la configuration de sauts express et les fonctions de phase 2 ne sont pas inclus.
