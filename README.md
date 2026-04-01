# PROJET_CGP_ANNUAIRE_FORMATION

## Stack

- `frontend/` : React (Vite) — UI
- `backend-nest/` : NestJS + TypeScript + Prisma — API
- `script/db/` : scripts SQL Postgres (manuel)
- `script/db/init/` : scripts SQL Postgres (init automatique)

## Docker (React + Node + PostgreSQL)

- Scripts SQL d'init : `script/db/init/` (exécutés au 1er démarrage de Postgres)
- Front : http://localhost:5173
- Back : http://localhost:3001/api/health
- Postgres : localhost:5432
- Le backend est considéré "ready" uniquement quand `/api/health` répond et que la DB est joignable.
- Le frontend attend automatiquement que le backend soit `healthy` avant de démarrer.

### Démarrage

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend-nest
```
Commandes utiles
Lancer (Postgres sur 5433) :
POSTGRES_PORT=5433 docker compose -f docker-compose.yml up -d --build
Voir l’état :
docker compose -f docker-compose.yml ps
Voir les logs :
docker compose -f docker-compose.yml logs -f
Arrêter :
docker compose -f docker-compose.yml down
Arrêter + supprimer volumes (reset DB / node_modules) :
docker compose -f docker-compose.yml down -v
Statut actuel (OK)
DB: localhost:5433 (healthy)
Backend: http://localhost:3001 (healthy)
Frontend: http://localhost:5173 (up)
(J’ai aussi corrigé l’ordre de démarrage Prisma dans backend-nest/package.json pour éviter le crash.)
Attendu dans `docker compose ps` :

- `db` : `healthy`
- `backend-nest` : `healthy`
- `frontend` : `up`

### Vérification login après démarrage

```bash
curl -i -H "x-user-login: alain.rousseau" http://localhost:5173/api/auth/me
```

Réponse attendue : `HTTP/1.1 200 OK`.

### Lancer un service (optionnel)

```bash
docker compose up --build frontend
docker compose up --build db
```

### Réinitialiser la base (rejouer les scripts `script/db/init/`)

```bash
docker compose down -v
docker compose up --build
```

### Recréer les conteneurs proprement (sans supprimer la base)

```bash
docker compose down
docker compose up -d --build --force-recreate
```

## Sans Docker (local)

### Backend NestJS

```bash
cd backend-nest
npm install
npx prisma generate
npm run start:dev
```

Seed des comptes mock (optionnel) :

```bash
npm run seed
```

Auth mock (dev uniquement) : ajoute le header `x-user-login` (ex: `alain.rousseau`, `alice.herniaux`, `bruno.manil`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Note : en local, le proxy `/api` utilise `http://localhost:3001` par défaut. En Docker, `VITE_API_TARGET` est injecté vers `http://backend-nest:3001`.

## Dépannage Docker (Ubuntu)

Si `Cannot connect to the Docker daemon` :

```bash
sudo systemctl enable --now docker
sudo systemctl restart docker
```

Si `permission denied` sur `/var/run/docker.sock` :

```bash
getent group docker || sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

Si `failed to bind host port 0.0.0.0:5432` :

- arrête le Postgres local, ou change `POSTGRES_PORT` dans `.env` (ex: `5433`).

Si le front échoue avec `Cannot find module 'tailwindcss'` :

- le volume `frontend-node-modules` est obsolète → supprime-le puis relance :

```bash
docker volume rm annuaire-formation_frontend-node-modules
docker compose up --build frontend
```
