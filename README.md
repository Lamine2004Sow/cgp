# PROJET_CGP_ANNUAIRE_FORMATION

## Stack

- `frontend/` : React (Vite) — UI
- `backend/` : Node.js (Express) — API
- `backend-nest/` : NestJS + TypeScript + Prisma — API (par défaut en Docker)
- `script/db/` : scripts SQL Postgres (manuel)
- `script/db/init/` : scripts SQL Postgres (init automatique)

## Docker (React + Node + PostgreSQL)

- Scripts SQL d'init : `script/db/init/` (exécutés au 1er démarrage de Postgres)
- Front : http://localhost:5173
- Back : http://localhost:3001/api/health
- Postgres : localhost:5432
Note : le service `backend` (Express) est en profil `legacy`. Le service `backend-nest` (NestJS) est lancé par défaut.

### Démarrage

```bash
cp .env.example .env
docker compose up --build
```

### Lancer un service (optionnel)

```bash
docker compose up --build frontend
docker compose up --build backend
docker compose up --build db
```

Pour lancer l'ancien backend (Express) :

```bash
docker compose --profile legacy up --build backend
```

### Réinitialiser la base (rejouer les scripts `script/db/init/`)

```bash
docker compose down -v
docker compose up --build
```

## Sans Docker (local)

### Backend

```bash
cd backend
npm install
npm run dev
```

Variables utiles (si Postgres tourne en local) : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Backend NestJS (nouveau)

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

Auth mock (dev uniquement) : ajoute le header `x-user-login` (ex: `dc.infocom`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Note : en local, le proxy `/api` utilise `http://localhost:3001` par défaut. En Docker, `VITE_API_TARGET` est injecté vers `http://backend:3001`.

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
