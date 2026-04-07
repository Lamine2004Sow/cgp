# CGP - Annuaire Formation

Application de gestion d'annuaire universitaire orientée structures, responsables, années académiques et organigrammes.

Le projet permet notamment:

- la recherche de responsables, structures, formations et secrétariats
- la gestion des utilisateurs, affectations, contacts de rôle et délégations
- la gestion des structures académiques par année universitaire
- la génération d'organigrammes de structures et de personnes
- l'import/export de données, y compris via un classeur Excel standardisé réimportable
- la gestion des signalements, notifications et du journal d'audit

## Stack

- `frontend/`: React + Vite + TypeScript
- `backend-nest/`: NestJS + Prisma + TypeScript
- `db`: PostgreSQL 16
- `docker-compose.yml`: orchestration locale
- `script/db/init/`: scripts SQL d'initialisation de la base

## Documentation

La documentation détaillée se trouve dans [documentation/README.md](./documentation/README.md).

Points d'entrée principaux:

- [documentation/MANUEL_TECHNIQUE.md](./documentation/MANUEL_TECHNIQUE.md)
- [documentation/API_BACKEND.md](./documentation/API_BACKEND.md)
- [documentation/EXPLOITATION_MAINTENANCE.md](./documentation/EXPLOITATION_MAINTENANCE.md)
- [documentation/RECETTE_TEST.md](./documentation/RECETTE_TEST.md)

## Architecture rapide

```text
Navigateur
  -> frontend React/Vite
  -> API NestJS (/api)
  -> Prisma
  -> PostgreSQL
```

Organisation du dépôt:

```text
.
├── backend-nest/
├── frontend/
├── files/
├── script/
├── documentation/
└── docker-compose.yml
```

## Démarrage rapide avec Docker

Le mode recommandé pour travailler sur le projet est Docker.

### Lancer la stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend-nest
```

Services exposés par défaut:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001/api/health`
- postgres: `localhost:5433`

État attendu:

- `db`: `healthy`
- `backend-nest`: `healthy`
- `frontend`: démarré

### Vérifier l'auth mock

```bash
curl -i -H "x-user-login: alain.rousseau" http://localhost:5173/api/auth/me
```

Réponse attendue: `HTTP/1.1 200 OK`

## Fonctionnalités clés déjà en place

- gestion des années avec création, activation, archivage, clonage complet ou sélectif et suppression avec sauvegarde standardisée
- organigrammes en vue `structures` et `personnes`, avec filtres, exports et bibliothèque des organigrammes déjà générés
- vue personnes avec affiliation, mail institutionnel et mail secondaire
- vue structures avec responsables affichés de manière simplifiée: nom, prénom et mail institutionnel
- consultation des organigrammes générés possible au-delà du périmètre de génération, pour faciliter la recherche de contacts
- génération d'organigrammes limitée au périmètre structurel du rôle, sauf pour les services centraux
- filtres hiérarchiques dynamiques sur plusieurs écrans
- import/export standardisé via classeur Excel XML `CGP_STANDARD_V1`
- import ciblé possible sur une structure précise
- prévisualisation des conflits avant import

## Variables d'environnement

Un exemple est disponible dans [.env.example](./.env.example).

Variables principales:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `AUTH_MODE`
- `CORS_ORIGINS`

## Commandes utiles

### Voir l'état des conteneurs

```bash
docker compose ps
```

### Voir les logs

```bash
docker compose logs -f
docker compose logs -f backend-nest
docker compose logs -f frontend
docker compose logs -f db
```

### Arrêter la stack

```bash
docker compose down
```

### Réinitialiser complètement la base locale

```bash
docker compose down -v
docker compose up -d --build
```

### Lancer les builds de vérification

```bash
docker compose exec -T frontend npm run build
docker compose exec -T backend-nest npm run build
```

### Lancer les tests backend

```bash
docker compose exec -T backend-nest npm run test
docker compose exec -T backend-nest npm run test:e2e
```

## Authentification en développement

Le projet tourne par défaut en mode `AUTH_MODE=mock`.

Concrètement:

- le frontend conserve le login en local
- chaque appel API envoie `x-user-login`
- le backend reconstruit l'utilisateur courant à partir de la base

Il faut donc utiliser un login réellement présent dans la table `utilisateur`.

## Lancement hors Docker

Possible, mais non recommandé pour le quotidien tant que l'équipe travaille principalement via Docker.

### Backend

```bash
cd backend-nest
npm install
npx prisma generate
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

En local, le frontend appelle `http://localhost:3001` via le proxy `/api`.

## Base de données et seeds

Le projet combine:

- une initialisation SQL via `script/db/init/`
- des scripts Prisma dans `backend-nest/prisma/`

Scripts utiles:

- `npm run seed`
- `npm run seed:csv`
- `npm run db:reset`
- `npm run migrate:new`
- `npm run migrate:deploy`

Voir [documentation/EXPLOITATION_MAINTENANCE.md](./documentation/EXPLOITATION_MAINTENANCE.md) pour le détail.

## Dépannage rapide

### Docker n'est pas accessible

```bash
sudo systemctl enable --now docker
sudo systemctl restart docker
```

### Problème de permission sur le socket Docker

```bash
getent group docker || sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

### Conflit de port Postgres

Modifier `POSTGRES_PORT` dans `.env`, ou lancer par exemple:

```bash
POSTGRES_PORT=5434 docker compose up -d --build
```

### Le frontend ne compile plus après changement de dépendances

Le volume `frontend-node-modules` peut être obsolète:

```bash
docker compose down
docker volume rm annuaire-formation_frontend-node-modules
docker compose up -d --build frontend
```

## Pour les futurs contributeurs

Avant de livrer une évolution:

- mettre à jour la documentation si le comportement change
- vérifier les builds frontend et backend
- vérifier les droits d'accès si une route ou un écran change
- valider les parcours impactés en recette manuelle
