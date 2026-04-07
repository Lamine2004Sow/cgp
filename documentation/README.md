# Documentation Technique

Cette documentation sert de base de travail pour trois profils:

- développeurs qui doivent comprendre l'architecture et modifier le code
- testeurs qui doivent valider les parcours clés et les droits
- mainteneurs qui doivent démarrer, diagnostiquer, sauvegarder et faire évoluer la plateforme

## Sommaire

- [MANUEL_TECHNIQUE.md](./MANUEL_TECHNIQUE.md)
  Vue d'ensemble du produit, architecture, modules, modèle de données et conventions.
- [API_BACKEND.md](./API_BACKEND.md)
  Catalogue des endpoints NestJS, droits d'accès et contrats utiles.
- [EXPLOITATION_MAINTENANCE.md](./EXPLOITATION_MAINTENANCE.md)
  Démarrage, Docker, variables d'environnement, seed, maintenance et dépannage.
- [RECETTE_TEST.md](./RECETTE_TEST.md)
  Stratégie de test, tests existants, cas de recette manuelle et checklists de non-régression.

## Portée

La documentation couvre l'état actuel du dépôt:

- `frontend/`: application React/Vite
- `backend-nest/`: API NestJS/Prisma
- `docker-compose.yml`: orchestration locale
- `script/`: scripts SQL et utilitaires de préparation de données
- `files/`: fichiers de référence, exports et assets projet

## Règle de maintenance

À chaque évolution structurelle importante, cette documentation doit être revue en même temps que le code, en particulier si les changements touchent:

- le schéma Prisma
- les routes backend
- les rôles et gardes d'autorisation
- les formats d'import/export
- les workflows année universitaire ou organigramme
