# Recette et Tests

## 1. État actuel des tests automatisés

## 1.1 Backend

Tests présents:

- `src/app.controller.spec.ts`
- `src/modules/affectations/affectations.service.spec.ts`
- `src/modules/delegations/delegations.service.spec.ts`
- `src/modules/roles/roles.service.spec.ts`
- `src/modules/users/users.service.spec.ts`
- `test/app.e2e-spec.ts`

Commandes utiles:

```bash
docker compose exec -T backend-nest npm run test
docker compose exec -T backend-nest npm run test:e2e
docker compose exec -T backend-nest npm run test:cov
```

## 1.2 Frontend

Il n'existe pas actuellement de suite de tests automatisés dédiée au frontend dans le dépôt. La qualité côté UI repose donc surtout sur:

- le build TypeScript/Vite
- la recette manuelle
- la cohérence des contrats d'API

## 2. Vérifications minimales avant merge

```bash
docker compose exec -T frontend npm run build
docker compose exec -T backend-nest npm run build
docker compose exec -T backend-nest npm run test
```

## 3. Jeux de données

Pour les recettes, il faut vérifier d'abord:

- qu'une année `EN_COURS` existe
- qu'au moins une composante, un département et une mention sont présents
- qu'au moins un utilisateur avec affectation existe
- qu'un login de test connu est disponible dans la table `utilisateur`

## 4. Recette fonctionnelle par domaine

## 4.1 Authentification mock

Scénarios:

- se connecter avec un login existant
- tenter un login inexistant
- vérifier l'appel `/api/auth/me`
- vérifier la persistance du login dans le navigateur

## 4.2 Navigation et droits

Scénarios:

- vérifier qu'un service central voit tous les écrans de gestion
- vérifier qu'un rôle plus restreint ne voit pas les écrans interdits
- vérifier qu'un utilisateur simple garde l'accès à la recherche et au profil

## 4.3 Recherche annuaire

Scénarios:

- rechercher un responsable par nom
- rechercher une structure par mot-clé
- rechercher une formation par mention ou parcours
- tester un filtre hiérarchique progressif composante vers niveau
- tester une recherche directe par identifiant disponible

## 4.4 Gestion des responsables

Scénarios:

- créer un utilisateur
- lui ajouter une affectation
- modifier ses coordonnées
- ajouter ou modifier un contact de rôle
- supprimer une affectation
- supprimer un utilisateur autorisé

## 4.5 Fiches structures

Scénarios:

- ouvrir le détail d'une structure
- vérifier la remontée responsables et secrétariat
- modifier les champs autorisés d'une structure
- tester la cohérence des filtres hiérarchiques

## 4.6 Délégations

Scénarios:

- créer une délégation valide
- vérifier sa visibilité pour le délégant
- révoquer la délégation
- exporter le CSV côté service central

## 4.7 Signalements

Scénarios:

- créer un signalement
- le faire prendre en charge
- le faire escalader
- le clôturer avec commentaire
- vérifier la notification associée si applicable

## 4.8 Organigrammes

Scénarios:

- générer un organigramme de structure
- basculer en vue personnes
- filtrer par rôle
- filtrer par hiérarchie structurelle
- exporter en PDF
- exporter en JSON ou CSV
- figer un organigramme si connecté en service central
- ouvrir un organigramme déjà généré depuis la bibliothèque

Points d'attention:

- la vue personnes doit afficher des personnes uniquement
- l'affiliation structurelle doit rester visible
- la chaîne hiérarchique N+1 ne doit pas être cassée par les filtres

## 4.9 Années universitaires

Scénarios:

- lister les années
- créer une année vide
- cloner une année complète
- cloner une année avec structures sélectionnées seulement
- créer une année sans affectations
- activer une année
- archiver une année
- supprimer une année et vérifier le téléchargement de la sauvegarde workbook

## 4.10 Import / export

### Imports hérités

- importer un CSV responsables valide
- exclure certaines lignes à la confirmation
- vérifier la création des utilisateurs et affectations

### Workbook standardisé

- télécharger un export standard d'année
- télécharger un modèle vide
- modifier un fichier dans Excel
- recharger le fichier côté UI
- lancer la preview
- vérifier les compteurs `create`, `update`, `reuse`, `skip`, `warning`, `error`
- confirmer l'import
- répéter avec un import limité à une structure du fichier
- répéter avec création de l'année cible

## 4.11 Audit

Scénarios:

- vérifier qu'une action sensible crée un log
- filtrer le journal d'audit
- exporter le CSV d'audit

## 5. Non-régression ciblée après modifications de code

## 5.1 Si modification du schéma Prisma

Vérifier:

- migrations ou `db push`
- seed ou import encore fonctionnels
- pages frontend utilisant les champs modifiés
- documentation synchronisée

## 5.2 Si modification des gardes ou rôles

Vérifier:

- accès à l'écran
- accès API direct
- visibilité des actions dans l'UI
- absence de fuite hors périmètre structure ou année

## 5.3 Si modification import/export

Vérifier:

- export d'un fichier lisible
- réimport du même fichier
- comportement sur doublons
- prévisualisation cohérente
- import limité à une structure

## 5.4 Si modification organigrammes

Vérifier:

- génération
- affichage structure
- affichage personnes
- export
- bibliothèque des organigrammes générés

## 6. Recommandation pratique

En l'absence de tests frontend automatisés, toute évolution significative devrait être validée au minimum par:

1. build frontend
2. build backend
3. parcours manuel du domaine modifié
4. contrôle des permissions avec au moins deux profils utilisateurs
