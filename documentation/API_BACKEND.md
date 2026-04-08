# Référence API Backend

## 1. Généralités

### Base URL

- en local via frontend: `/api`
- backend direct: `http://localhost:3001/api`

### Authentification en développement

- header requis: `x-user-login`
- le backend reconstruit l'utilisateur courant à partir du login

### Réponses

Le backend renvoie principalement du JSON. Pour certains exports, il renvoie aussi:

- du texte CSV encapsulé dans `{ csv }`
- des fichiers encodés base64 avec `{ fileName, mimeType, contentBase64 }`

### Contrôles d'accès

En plus de `@Roles`, la lecture ou l'écriture peut être refusée par:

- `ScopeGuard` si l'entité est hors périmètre
- `YearGuard` si l'année est hors périmètre

## 2. Santé et session

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/health` | public technique | santé applicative et DB |
| `GET` | `/auth/me` | utilisateur authentifié | renvoie l'utilisateur courant hydraté |

## 3. Années universitaires

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/years` | tous rôles | liste complète pour `services centraux`, année courante seulement pour les autres rôles |
| `GET` | `/years/:id` | tous rôles | détail d'une année, limité à l'année courante pour les non-`services centraux` |
| `POST` | `/years/:id/clone` | services centraux | crée une nouvelle année depuis une année source ou `0` pour une année vide |
| `PATCH` | `/years/:id/status` | services centraux | passe l'année en `EN_COURS`, `PREPARATION` ou `ARCHIVEE` |
| `DELETE` | `/years/:id` | services centraux | exporte une sauvegarde workbook puis supprime l'année |

### Corps utiles

`POST /years/:id/clone`

- `libelle`
- `date_debut`
- `date_fin`
- `statut`
- `copy_affectations`
- `root_entite_ids` optionnel pour un clonage sélectif

`PATCH /years/:id/status`

- `statut`

## 4. Structures

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/entites` | tous rôles | liste des structures d'une année |
| `GET` | `/entites/:id` | tous rôles | détail structure, responsables, secrétariat et statistiques |
| `PATCH` | `/entites/:id` | services centraux | mise à jour d'une structure |

## 5. Utilisateurs

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/users` | tous rôles | liste paginée des utilisateurs |
| `GET` | `/users/:id` | tous rôles | détail d'un utilisateur |
| `POST` | `/users` | services centraux, DC, DA, DAA | création d'un utilisateur |
| `PATCH` | `/users/:id` | large spectre selon contrôleur | mise à jour, avec règle spéciale pour auto-édition |
| `DELETE` | `/users/:id` | services centraux, directeur composante | suppression |

### Règle particulière

Un utilisateur qui modifie sa propre fiche ne peut changer que certains champs personnels, pas son identité métier.

## 6. Affectations et contacts

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `POST` | `/affectations` | services centraux, DC, DA, DAA | crée une affectation |
| `GET` | `/affectations/:id` | tous rôles | détail d'une affectation |
| `PATCH` | `/affectations/:id` | services centraux, DC, DA, DAA | mise à jour d'affectation |
| `PATCH` | `/affectations/:id/contact` | tous rôles | création ou mise à jour du contact fonctionnel |
| `DELETE` | `/affectations/:id` | services centraux, DC, DA, DAA | suppression d'affectation |

## 7. Rôles et demandes de rôles

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/roles` | tous rôles | référentiel des rôles |
| `GET` | `/roles/requests` | rôles de direction + SC | liste des demandes |
| `POST` | `/roles/requests` | rôles de direction | création d'une demande |
| `PATCH` | `/roles/requests/:id` | services centraux | validation ou refus |

## 8. Recherche annuaire

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/search/responsables` | tous rôles | recherche de responsables |
| `GET` | `/search/formations` | tous rôles | recherche de formations |
| `GET` | `/search/structures` | tous rôles | recherche de structures |
| `GET` | `/search/secretariats` | tous rôles | recherche de secrétariats |

### Filtres récurrents

Selon la route:

- `q`
- `yearId`
- `roleId`
- `page`
- `pageSize`
- filtres hiérarchiques par entité
- filtres de type de diplôme ou type de structure

## 9. Organigrammes

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/organigrammes` | tous rôles | liste des organigrammes déjà générés de l'année |
| `GET` | `/organigrammes/latest` | tous rôles | dernier organigramme de l'année dans le périmètre de l'utilisateur, avec arbre filtré |
| `POST` | `/organigrammes/generate` | SC, DC, DA, DAA, DD, DM, DS, RF | génération d'un organigramme dans le périmètre autorisé du rôle |
| `GET` | `/organigrammes/:id/tree` | tous rôles | lecture d'un organigramme existant, avec filtres, y compris hors périmètre de génération |
| `PATCH` | `/organigrammes/:id/freeze` | services centraux | fige ou défige un organigramme |
| `GET` | `/organigrammes/:id/export` | tous rôles | export PDF, CSV, JSON ou SVG d'un organigramme consultable |

### Paramètres utiles

- `yearId`
- `view`
  `STRUCTURES` ou `PERSONNES`
- `q`
  recherche
- `roleId`
- `entiteIds`
- `format`

### Notes d'autorisation

- la consultation des organigrammes déjà générés est plus large que la génération
- la génération reste bornée à la structure de l'utilisateur et à ses descendants, sauf `services-centraux`
- `latest` reste volontairement limité au périmètre de l'utilisateur hors `services-centraux`
- `PATCH /organigrammes/:id/freeze` accepte `est_fige=true|false`

## 10. Délégations

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/delegations` | utilisateur authentifié | liste filtrée selon identité et droits |
| `POST` | `/delegations` | DC, DA, DAA | création d'une délégation |
| `GET` | `/delegations/export` | services centraux | export CSV |
| `PATCH` | `/delegations/:id/revoke` | délégant concerné ou services centraux | révocation |

## 11. Signalements

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/signalements` | utilisateur authentifié | liste des signalements visibles |
| `POST` | `/signalements` | utilisateur authentifié | création d'un signalement |
| `PATCH` | `/signalements/:id` | selon règles du service | traitement, prise en charge ou clôture |
| `PATCH` | `/signalements/:id/escalade` | utilisateur authentifié | escalade vers services centraux |

## 12. Notifications

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/notifications` | tous rôles | liste paginée des notifications de l'utilisateur courant |
| `PATCH` | `/notifications/:id/read` | tous rôles | marquage lu |

## 13. Tableau de bord

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/dashboard/stats` | tous rôles | statistiques globales pour une année |

## 14. Audit

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/audit` | services centraux | consultation du journal |
| `GET` | `/audit/export` | services centraux | export CSV du journal |

## 15. Imports et exports

## 15.1 Exports

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `GET` | `/exports/responsables` | services centraux | export hérité responsables |
| `GET` | `/exports/workbook` | services centraux | export workbook standardisé année ou structure |

### Paramètres utiles

- `yearId` obligatoire pour `/exports/workbook`
- `entiteId` optionnel
- `roleId` pour certains exports hérités
- `template=true` pour générer un modèle vide standardisé

## 15.2 Imports hérités

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `POST` | `/imports/responsables/preview` | SC, DC, DA, DAA | preview CSV responsables |
| `POST` | `/imports/responsables/confirm` | SC, DC, DA, DAA | confirmation sélective |
| `POST` | `/imports/responsables` | SC, DC, DA, DAA | import direct CSV |

## 15.3 Imports workbook standardisé

| Méthode | Route | Accès | Usage |
| --- | --- | --- | --- |
| `POST` | `/imports/workbook/preview` | services centraux | simulation d'import du classeur standard |
| `POST` | `/imports/workbook/confirm` | services centraux | import réel du classeur standard |

### Corps utiles

- `workbook`
  payload parsé côté frontend
- `targetYearId`
  année cible existante
- `createTargetYear`
  création de l'année cible depuis la méta du fichier
- `scopeSourceEntiteId`
  import limité à une structure du fichier

## 16. Remarques d'intégration

- la plupart des listes renvoient des enveloppes nommées
- certains services font des vérifications métier plus strictes que le simple rôle
- toute nouvelle route doit être vérifiée contre `ScopeGuard` et `YearGuard`
- si une route manipule un fichier, documenter aussi son format côté frontend
