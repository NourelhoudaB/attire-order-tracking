# API TENUE PRO

Les routes sont relatives à `/api`. Le cookie de session est automatiquement envoyé par le navigateur. Pour une mutation, envoyer `Content-Type: application/json`, `X-Tenue-Pro: 1` et un `Origin` correspondant au site. Ne jamais enregistrer les corps des requêtes de comptes. Les dates de réponse utilisent ISO 8601.

## Comptes

| Méthode | Route                      | Corps / réponse                             | Autorisation                              |
| ------- | -------------------------- | ------------------------------------------- | ----------------------------------------- |
| POST    | /auth/login                | `{username,password}` → compte sans hachage | Public, limité par identifiant et IP      |
| GET     | /auth/me                   | Compte courant                              | Session, y compris changement obligatoire |
| POST    | /auth/logout               | `{}`                                        | Session                                   |
| POST    | /auth/change-password      | `{password}` → compte actualisé             | Session                                   |
| GET     | /users                     | Liste des comptes sans hachages             | Administrateur                            |
| POST    | /users                     | `{username,displayName?,role,password}`     | Administrateur                            |
| PATCH   | /users/:id                 | `{displayName?,role?,isActive?}`            | Administrateur                            |
| POST    | /users/:id/reset-password  | `{password}`                                | Administrateur                            |
| POST    | /users/:id/revoke-sessions | `{}`                                        | Administrateur                            |

Les rôles sont ceux de `packages/shared/index.ts`. Une désactivation conserve l’historique. Un administrateur ne peut pas se désactiver ou retirer son propre rôle administrateur. Les mutations de compte invalident les sessions existantes. Les réponses n’incluent ni hachage ni mot de passe temporaire ; ce dernier est saisi ou généré dans le formulaire administratif.

## Commandes et communication

| Méthode | Route                              | Entrée                                                                                      | Autorisation                                 |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| GET     | /orders                            | `?q=&status=`                                                                               | Connecté                                     |
| GET     | /orders/:id                        | —                                                                                           | Connecté                                     |
| PATCH   | /orders/:id                        | `{fabric?,fabricMeters?,personalization?,isPriority?,isExpress?,isStockout?,stockoutNote?}` | Manager / administrateur, importée seulement |
| POST    | /orders/:id/plan                   | `{}`                                                                                        | Manager / administrateur                     |
| POST    | /orders/:id/unplan                 | `{}`                                                                                        | Manager / administrateur, aucune étape faite |
| POST    | /orders/:id/steps/current/complete | `{expectedStepId}`                                                                          | Responsable courant / administrateur         |
| POST    | /orders/import-csv                 | `{text}` ou `{xlsx}` (base64)                                                               | Manager / administrateur                     |
| POST    | /sync/oneboard                     | `{}` → 501 tant que non documenté                                                           | Manager / administrateur                     |
| GET     | /messages                          | —                                                                                           | Connecté, destinataires filtrés              |
| POST    | /messages                          | `{toRole,orderRef?,body}`                                                                   | Connecté sauf consultation                   |
| POST    | /messages/read                     | `{ids: string[]}`                                                                           | Connecté, destinataires filtrés              |
| GET     | /events                            | Flux SSE, événements `connected`, `change`, `expired`                                       | Connecté                                     |
| GET     | /audit                             | 200 dernières opérations                                                                    | Administrateur                               |
| GET     | /sync/runs                         | 100 dernières synchronisations                                                              | Administrateur                               |
| GET     | /openapi.json                      | Document OpenAPI Fastify                                                                    | Administrateur                               |

Une validation d’étape est permanente. Le rôle est obtenu depuis la session et la base, jamais depuis le corps d’une requête. `expectedStepId` rend un double clic ou une ancienne vue inoffensifs : seule une requête sur l’étape attendue peut aboutir. Un conflit de progression renvoie 409. Une action de rôle interdite renvoie 403 : « Action non autorisée pour votre rôle ».
