# Manuel Technique

## 1. Objet du projet

Le projet CGP est un annuaire de formation universitaire avec gouvernance par rôles, structures et années universitaires. Il permet notamment:

- la recherche de responsables, formations, structures et secrétariats
- la gestion des utilisateurs, affectations et contacts de rôle
- la gestion hiérarchique des structures académiques
- la génération et l'export d'organigrammes de structures et de personnes
- la gestion des délégations, demandes de rôles, notifications et signalements
- la gestion du cycle de vie des années universitaires
- l'import/export de données, y compris via un classeur Excel standardisé réimportable

## 2. Stack technique

### Backend

- Node.js 22 en conteneur
- NestJS 11
- Prisma 7
- PostgreSQL 16
- PDFKit pour les exports PDF d'organigramme

### Frontend

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- `lucide-react` pour les icônes

### Orchestration locale

- Docker Compose
- trois services permanents: `db`, `backend-nest`, `frontend`
- un service outil optionnel: `migrate`

## 3. Architecture globale

## 3.1 Vue logique

Le flux principal est le suivant:

1. Le navigateur charge l'application React sur `frontend`.
2. Le frontend appelle l'API via `/api`.
3. Le backend NestJS applique les gardes d'authentification, de rôle, de portée structurelle et d'année.
4. Prisma interagit avec PostgreSQL.
5. Certains flux lisent ou exportent aussi des fichiers standardisés via `files/`.

## 3.2 Structure du dépôt

```text
.
├── backend-nest/
│   ├── prisma/
│   ├── src/
│   │   ├── auth/
│   │   ├── common/
│   │   └── modules/
│   └── test/
├── frontend/
│   └── src/
├── files/
├── script/
├── docker-compose.yml
└── documentation/
```

## 3.3 Dossiers importants

- `backend-nest/src/auth/`
  Auth mock et logique d'autorisation.
- `backend-nest/src/common/`
  Prisma, décorateurs, gardes, filtres, intercepteurs et types partagés.
- `backend-nest/src/modules/`
  Modules métier.
- `backend-nest/prisma/`
  Schéma Prisma, seed, initialisation Docker et utilitaires DB.
- `frontend/src/components/`
  Écrans métier.
- `frontend/src/lib/`
  utilitaires API, état URL, hiérarchie des entités et format Excel standard.
- `files/assets/`
  documents et classeurs de référence du projet.
- `script/db/init/`
  initialisation SQL Postgres exécutée au premier démarrage du conteneur DB.

## 4. Authentification, rôles et contrôles d'accès

## 4.1 Authentification

Le projet fonctionne actuellement en mode `AUTH_MODE=mock` par défaut en développement.

- le frontend stocke le login dans `localStorage`
- chaque appel API ajoute le header `x-user-login`
- le backend reconstruit l'utilisateur courant à partir de la table `utilisateur` et de ses `affectation`

Conséquence pratique:

- il n'y a pas de session serveur classique
- la base doit contenir un utilisateur correspondant au login transmis
- hors développement, le `MockAuthGuard` refuse le mode mock

## 4.2 Rôles

Les rôles applicatifs sont définis dans `backend-nest/src/auth/roles.constants.ts` et répliqués côté frontend dans `frontend/src/types.ts`.

Les rôles structurants sont:

- `services-centraux`
- `administrateur`
- rôles de direction: composante, administratif, département, mention, spécialité, formation, année
- `secretariat-pedagogique`
- `utilisateur-simple`
- `lecture-seule`

## 4.3 Gardes backend

Le backend applique globalement:

- `MockAuthGuard`
  hydrate `request.user` à partir de `x-user-login`
- `RolesGuard`
  valide les rôles exigés par les contrôleurs
- `ScopeGuard`
  limite l'accès à l'entité de l'utilisateur et à ses descendants hiérarchiques
- `YearGuard`
  limite l'accès aux années de l'utilisateur, sauf `services-centraux`
- `ThrottleGuard`
  garde de base anti-abus

## 4.4 Audit

L'application utilise un `AuditInterceptor` global. Le journal métier est stocké dans `journal_audit` et consultable via le module audit réservé aux services centraux.

## 5. Modèle de données

## 5.1 Noyau métier

Le schéma Prisma tourne autour de quelques modèles centraux:

- `annee_universitaire`
  année académique, statut, lien éventuel vers l'année source
- `entite_structure`
  arbre hiérarchique des structures pour une année
- `utilisateur`
  identité de la personne
- `role`
  référentiel de rôles
- `affectation`
  lien entre utilisateur, rôle, structure et année
- `contact_role`
  coordonnées fonctionnelles portées par une affectation

## 5.2 Hiérarchie des structures

Les types structurants sont:

- `COMPOSANTE`
- `DEPARTEMENT`
- `MENTION`
- `PARCOURS`
- `NIVEAU`

La hiérarchie est portée par `entite_structure.id_entite_parent`.

Les tables spécialisées enrichissent selon le type:

- `composante`
- `departement`
- `mention`
- `parcours`
- `niveau`

## 5.3 Relations métier complémentaires

- `delegation`
  délégation d'un droit entre deux utilisateurs sur une entité
- `organigramme`
  trace d'une génération d'organigramme et de ses exports
- `signalement`
  erreur ou demande de correction remontée par un utilisateur
- `notification`
  notifications liées aux demandes et signalements
- `demande_role`
  demande de rôle personnalisé
- `demande_modification`
  demande de modification ciblée
- `journal_audit`
  journal de changements

## 5.4 Particularités importantes

- `affectation` est unique sur `(id_user, id_role, id_entite, id_annee)`
- la hiérarchie des personnes repose sur `affectation.id_affectation_n_plus_1`
- `annee_universitaire.id_annee_source` permet de tracer un clonage
- certaines suppressions nécessitent un ordre précis à cause des dépendances métier

## 6. Modules backend

| Module | Rôle principal | Fichiers pivots |
| --- | --- | --- |
| `auth` | hydratation de l'utilisateur courant, lecture profil | `auth.service.ts`, `auth.controller.ts` |
| `users` | listing, détail, création, mise à jour, suppression d'utilisateurs | `users.controller.ts`, `users.service.ts` |
| `roles` | référentiel des rôles et demandes de rôles | `roles.controller.ts`, `roles.service.ts` |
| `entites` | liste, détail et édition des structures | `entites.controller.ts`, `entites.service.ts` |
| `affectations` | création, édition, suppression d'affectations et contacts | `affectations.controller.ts`, `affectations.service.ts` |
| `search` | recherche annuaire multi-axes | `search.controller.ts`, `search.service.ts` |
| `delegations` | délégations, export CSV, révocation | `delegations.controller.ts`, `delegations.service.ts` |
| `organigrammes` | génération, lecture, figer, export PDF/CSV/JSON/SVG | `organigrammes.controller.ts`, `organigrammes.service.ts` |
| `annees` | lister, cloner, archiver, supprimer avec sauvegarde | `annees.controller.ts`, `annees.service.ts` |
| `exports` | exports hérités et classeur standardisé | `exports.controller.ts`, `exports.service.ts`, `standard-workbook.service.ts` |
| `imports` | imports hérités CSV et import workbook standardisé avec preview | `imports.controller.ts`, `imports.service.ts` |
| `dashboard` | statistiques de synthèse | `dashboard.controller.ts`, `dashboard.service.ts` |
| `demandes` | signalements et traitement | `signalements.controller.ts`, `signalements.service.ts` |
| `notifications` | lecture des notifications et marquage lu | `notifications.controller.ts`, `notifications.service.ts` |
| `audit` | consultation et export du journal d'audit | `audit.controller.ts`, `audit.service.ts` |

## 7. Frontend

## 7.1 Organisation générale

`frontend/src/App.tsx` orchestre:

- l'authentification locale
- le chargement de l'utilisateur courant
- la sélection de l'année courante
- le menu de navigation
- le rendu conditionnel des écrans selon le rôle

## 7.2 Écrans principaux

| Écran | Fichier | Rôle |
| --- | --- | --- |
| Tableau de bord | `Dashboard.tsx` | synthèse chiffrée |
| Recherche | `DirectorySearch.tsx` | recherche responsables, formations, structures, secrétariats |
| Responsables | `ManageResponsibles.tsx` | gestion personnes, affectations, filtres hiérarchiques |
| Fiches structures | `ManageStructures.tsx` | consultation et édition des structures |
| Demandes de rôles | `ManageRoles.tsx` | création et revue des demandes |
| Délégations | `Delegations.tsx` | création, suivi, révocation, export |
| Organigramme | `OrgChart.tsx` | génération, lecture, filtre, export, vue structures/personnes |
| Import / Export | `ImportExport.tsx` | imports hérités et classeur standardisé |
| Années | `YearManagement.tsx` | clonage, archivage, activation, suppression avec sauvegarde |
| Signalements | `ErrorReports.tsx` | création et traitement |
| Audit | `AuditLogs.tsx` | consultation des logs |
| Profil | `UserProfile.tsx` | édition limitée de la fiche utilisateur |

## 7.3 Utilitaires frontend

- `lib/api.ts`
  wrapper `fetch`, ajout automatique du header `x-user-login`
- `lib/url-state.ts`
  persistance des filtres dans l'URL
- `lib/entite-hierarchy.ts`
  logique partagée de filtres hiérarchiques dynamiques
- `lib/standard-workbook.ts`
  parsing et téléchargement du format Excel XML standardisé

## 8. Flux métier sensibles

## 8.1 Gestion des années

Le module années permet désormais:

- création d'une année vide
- création d'une année par clonage d'une année source
- clonage de toute la base ou d'un sous-ensemble de structures racines
- choix de copier ou non les affectations
- archivage ou activation d'une année
- suppression avec export automatique d'un classeur de sauvegarde standardisé

Le clonage recopie:

- les structures retenues
- les tables spécialisées liées aux structures
- les contacts de rôle
- les affectations et la hiérarchie N+1 si demandé

## 8.2 Organigrammes

Le module organigrammes supporte:

- vue `structures`
- vue `personnes`
- filtres de recherche, rôle et hiérarchie
- export `PDF`, `CSV`, `JSON`, `SVG`
- figer et défiger un organigramme
- consultation d'une bibliothèque d'organigrammes déjà générés
- limitation du nombre d'éléments affichés dans la bibliothèque, avec filtres pour retrouver le reste
- réutilisation du dernier organigramme non figé quand une génération identique est relancée sur la même racine et la même année

Dans la vue personnes:

- seuls les nœuds personne sont affichés
- l'affiliation structurelle apparaît dans les informations
- le mail institutionnel principal et le mail secondaire apparaissent dans la fiche personne si disponibles
- la hiérarchie N+1 reste prise en compte

Dans la vue structures:

- les responsables affichés dans le détail rapide sont volontairement simplifiés
- seuls le nom, le prénom et le mail institutionnel sont présentés
- le rôle n'est pas répété dans cette fiche rapide pour garder une lecture plus compacte

Règles d'accès importantes:

- `services-centraux` peuvent générer sur toute racine autorisée et figer ou défiger
- les autres rôles de direction ne peuvent générer que sur leur structure et ses descendants
- les organigrammes déjà générés peuvent être consultés par les autres rôles, y compris hors de leur périmètre de génération, pour permettre la recherche de contacts
- le chargement par défaut du "dernier organigramme" reste borné au périmètre de l'utilisateur hors services centraux pour éviter d'ouvrir automatiquement un organigramme externe

## 8.3 Import / export standardisé

Le format standardisé est `CGP_STANDARD_V1`.

Il repose sur un classeur XML compatible Excel contenant:

- `roles`
- `structures`
- `users`
- `affectations`
- `contacts`
- `delegations`
- `signalements`
- `organigrammes`

Le backend gère:

- export année complète
- export d'une structure et de son sous-arbre
- génération d'un modèle vide
- preview d'import avec décision par ligne
- import ciblé sur une structure du fichier
- création éventuelle de l'année cible

Les statuts de preview sont:

- `create`
- `update`
- `reuse`
- `skip`
- `warning`
- `error`

## 8.4 Recherche et filtres dynamiques

Plusieurs écrans partagent désormais des filtres hiérarchiques composante vers niveau. L'objectif est de ne plus bloquer l'utilisateur dans un chemin unique et de lui permettre:

- une recherche directe libre
- un ciblage par structure
- un raffinement progressif par sous-filtres
- des recherches par identifiants métier disponibles dans la base

## 9. Données, seeds et fichiers de référence

## 9.1 Initialisation de la base

Deux approches coexistent:

- initialisation SQL via `script/db/init/`
- initialisation Prisma via `backend-nest/prisma/docker-init.ts`

`docker-init.ts` applique:

- `prisma migrate deploy` si des migrations existent
- sinon `prisma db push`
- puis un seed CSV seulement si la base est vide

## 9.2 Seeds Prisma

Les seeds disponibles sont:

- `prisma/seed.ts`
  seed démonstration riche
- `prisma/seed-from-csv.ts`
  seed depuis CSV si les fichiers source sont présents
- `prisma/reset-db.ts`
  reset de la base

## 9.3 Fichiers métier

Le dossier `files/assets/` contient des documents de référence utiles pour comprendre le métier et valider certaines hiérarchies, notamment `Annuaire.xlsx`.

## 10. Conventions et points d'attention

## 10.1 Convention d'API

Les contrôleurs renvoient souvent des enveloppes de type:

- `{ items }`
- `{ item }`
- `{ user }`
- `{ year }`
- `{ organigramme, arbre }`

Le frontend dépend de ces enveloppes. Un changement de forme de réponse doit être synchronisé des deux côtés.

## 10.2 Gestion des exports

Plusieurs exports sont renvoyés comme JSON contenant le nom de fichier, le type MIME et du contenu encodé en base64. Ce choix évite d'introduire une mécanique de téléchargement binaire plus lourde côté Vite/React.

## 10.3 Dette ou vigilance actuelle

- le backend a quelques tests unitaires, mais la couverture reste partielle
- le frontend n'a pas de suite de tests automatisés dédiée
- la qualité des imports dépend fortement de la cohérence des identifiants et du `login`
- les gardes de portée et d'année doivent être surveillés à chaque ajout d'endpoint
- les fichiers `dist/` sont régénérés lors des builds Docker

## 11. Étendre proprement le projet

### Ajouter un nouveau module backend

1. créer un module, un service et un contrôleur NestJS
2. brancher le module dans `AppModule`
3. protéger les routes avec `@Roles` si nécessaire
4. vérifier l'impact `ScopeGuard` et `YearGuard`
5. documenter la route dans `API_BACKEND.md`

### Ajouter un nouvel écran frontend

1. créer le composant dans `frontend/src/components/`
2. ajouter le type de vue si besoin dans `frontend/src/types.ts`
3. brancher l'écran dans `App.tsx`
4. vérifier les droits d'accès UI
5. documenter l'écran dans ce manuel ou dans la recette

### Faire évoluer le format workbook

1. modifier `STANDARD_WORKBOOK_COLUMNS` côté backend
2. synchroniser le parser frontend
3. versionner si rupture de compatibilité
4. mettre à jour la documentation d'import/export

## 12. Documents complémentaires

Pour aller plus loin:

- voir [API_BACKEND.md](./API_BACKEND.md) pour les routes
- voir [EXPLOITATION_MAINTENANCE.md](./EXPLOITATION_MAINTENANCE.md) pour l'exploitation locale et la maintenance
- voir [RECETTE_TEST.md](./RECETTE_TEST.md) pour la recette et la non-régression
