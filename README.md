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

### Démarrage

```bash
docker compose up -d --build
docker compose logs -f backend-nest
```

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
#### Fix immédiat : recréer les conteneurs + réseau proprement
Fais un reset “safe” (ne touche pas aux volumes) :
```bash
docker compose down
docker network prune -f
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

Auth mock (dev uniquement) : ajoute le header `x-user-login` (ex: `dc.infocom`).

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
