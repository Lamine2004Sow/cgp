# Rapport de failles de sécurité (revue statique)

Date: 2026-02-26  
Périmètre: `backend-nest/src`, `frontend/src`, `docker-compose.yml`, `.env.example`, `backend-nest/Dockerfile`

## Résumé

- Critique: 3
- Élevée: 3
- Moyenne: 4
- Faible: 2

---

## 1) [CRITIQUE] Authentification usurpable par simple header `x-user-login`

**Preuves**

- `backend-nest/src/common/guards/mock-auth.guard.ts:22` (mode par défaut `AUTH_MODE=mock`)
- `backend-nest/src/common/guards/mock-auth.guard.ts:37-45` (identité basée sur `x-user-login`)
- `frontend/src/lib/api.ts:7-16` (login stocké en `localStorage` + envoi du header)
- `frontend/src/components/Login.tsx:10-21` (logins de démo visibles)
- `docker-compose.yml:27-30` (`NODE_ENV=development` + `AUTH_MODE=mock` par défaut)
- `.env.example:9` (`AUTH_MODE=mock`)

**Impact**

N’importe qui pouvant appeler l’API peut se faire passer pour un autre utilisateur (ex: `sc.admin`) et hériter de ses droits.

**Correctif recommandé**

- Supprimer le mode mock en dehors d’un environnement local strict.
- Implémenter une vraie auth (CAS/OIDC/JWT signée, expiration, revocation).
- Retirer la logique d’identité depuis `x-user-login` côté production.

---

## 2) [CRITIQUE] Escalade de privilèges via création/modification d’affectations

**Preuves**

- `backend-nest/src/modules/affectations/affectations.controller.ts:13-18` (rôles non centraux autorisés à créer)
- `backend-nest/src/modules/affectations/affectations.controller.ts:33-37` (rôles non centraux autorisés à modifier)
- `backend-nest/src/modules/affectations/affectations.service.ts:39-45` (`id_role` pris tel quel depuis payload)
- `backend-nest/src/modules/affectations/affectations.service.ts:97-101` (`id_role` modifiable sans garde métier)

**Impact**

Un utilisateur manager peut potentiellement attribuer un rôle très privilégié (`services-centraux`, `administrateur`) à lui-même ou à d’autres.

**Correctif recommandé**

- Interdire l’attribution/modification de rôles sensibles hors services centraux.
- Ajouter une politique explicite “qui peut attribuer quoi” (RBAC/ABAC) au niveau service.
- Journaliser et alerter les changements de rôles sensibles.

---

## 3) [CRITIQUE] Comptes inactifs toujours authentifiables

**Preuves**

- `backend-nest/src/modules/users/users.service.ts:218-221` (suppression logique: `statut = INACTIF`)
- `backend-nest/src/auth/auth.service.ts:11-22` (auth par login sans filtrer `statut`)

**Impact**

Un compte désactivé peut continuer à se connecter et conserver ses droits (affectations toujours chargées).

**Correctif recommandé**

- Bloquer l’auth si `utilisateur.statut !== ACTIF`.
- Éventuellement désactiver/révoquer les affectations lors de l’inactivation.

---

## 4) [ÉLEVÉE] Contrôle de périmètre contournable (IDOR) sur certaines routes `:id`

**Preuves**

- `backend-nest/src/common/guards/scope.guard.ts:53-62` (pas de prise en compte de `params.id`)
- `backend-nest/src/common/guards/year.guard.ts:37-44` (pas de prise en compte de `params.id`)
- `backend-nest/src/modules/entites/entites.controller.ts:19-27` (`GET /entites/:id`)
- `backend-nest/src/modules/affectations/affectations.controller.ts:24-29` (`GET /affectations/:id`)

**Impact**

Un utilisateur authentifié peut consulter des ressources hors périmètre en testant des IDs.

**Correctif recommandé**

- Étendre les guards pour analyser `params.id` selon la ressource.
- Ajouter un contrôle métier d’accès dans les services (`findOne`) sur l’entité cible.

---

## 5) [ÉLEVÉE] Exposition globale de données (search/list) sans filtrage de périmètre métier

**Preuves**

- `backend-nest/src/modules/search/search.controller.ts:11-33` (accessible à tous les rôles)
- `backend-nest/src/modules/search/search.service.ts:11-68` (retourne emails responsables)
- `backend-nest/src/modules/entites/entites.controller.ts:12-16` + `entites.service.ts:94-108` (listing large)
- `backend-nest/src/modules/entites/entites.service.ts:178-193` (retourne email/téléphone/bureau dans détails)

**Impact**

Collecte massive d’informations personnelles/professionnelles (PII) possible par des rôles faibles.

**Correctif recommandé**

- Appliquer un filtrage de périmètre en service (pas seulement dans les guards génériques).
- Réduire les champs exposés selon le rôle (principe du moindre privilège).

---

## 6) [ÉLEVÉE] Secrets et paramètres sensibles faibles par défaut

**Preuves**

- `.env.example:4` (`POSTGRES_PASSWORD=1234`)
- `docker-compose.yml:10` et `docker-compose.yml:30` (mot de passe DB faible par défaut)
- `backend-nest/Dockerfile:5` (URL DB hardcodée avec `1234`)

**Impact**

Risque d’accès non autorisé à la base en cas d’exposition réseau ou de mauvaise isolation.

**Correctif recommandé**

- Supprimer tous les secrets hardcodés.
- Forcer des secrets forts via variables d’environnement/secret manager.
- Refuser le démarrage si mot de passe faible par défaut détecté.

---

## 7) [MOYENNE] Injection de formule CSV (CSV/Excel Injection)

**Preuves**

- `backend-nest/src/modules/exports/exports.service.ts:28-35`
- `backend-nest/src/modules/delegations/delegations.service.ts:140-153`
- `backend-nest/src/modules/audit/audit.service.ts:109-123`
- `backend-nest/src/modules/organigrammes/organigrammes.service.ts:297-310`
- `frontend/src/components/ImportExport.tsx:65-82`

**Impact**

Des valeurs commençant par `=`, `+`, `-`, `@` peuvent exécuter des formules à l’ouverture dans Excel/LibreOffice.

**Correctif recommandé**

Préfixer les cellules potentiellement dangereuses par `'` avant export.

---

## 8) [MOYENNE] Risque DoS par pagination non bornée

**Preuves**

- `backend-nest/src/common/utils/pagination.ts:22-23` (pas de limite max)
- DTOs avec `pageSize` seulement `@Min(1)` (ex: `search-query.dto.ts:29-33`, `users-list-query.dto.ts:11-15`, `audit-list-query.dto.ts:11-15`)

**Impact**

Un appel avec `pageSize` énorme peut saturer DB + mémoire applicative.

**Correctif recommandé**

Appliquer un plafond strict (ex: 100/200 max) dans `normalizePagination`.

---

## 9) [MOYENNE] Risque DoS sur imports (taille/volume non bornés)

**Preuves**

- `backend-nest/src/modules/imports/dto/import-responsables.dto.ts:54-57` (tableau `rows` sans limite)
- `backend-nest/src/modules/imports/imports.service.ts:48-158` (requêtes DB multiples par ligne)

**Impact**

Un payload massif peut provoquer un coût DB important et dégrader le service.

**Correctif recommandé**

- Limiter le nombre maximal de lignes importables par requête.
- Pré-charger/cache des références (rôles/années/entités) pour éviter N requêtes par ligne.

---

## 10) [MOYENNE] Fuite d’informations via messages d’erreur internes

**Preuves**

- `backend-nest/src/common/filters/all-exceptions.filter.ts:43` (renvoi du message au client)
- `backend-nest/src/common/filters/all-exceptions.filter.ts:55-57` (reprend `exception.message` brute)

**Impact**

Des erreurs internes peuvent exposer des détails techniques exploitables.

**Correctif recommandé**

- Retourner des messages génériques en production.
- Conserver le détail uniquement dans les logs serveur.

---

## 11) [FAIBLE] Pas de hardening HTTP (headers de sécurité)

**Preuves**

- `backend-nest/src/main.ts:6-29` (pas de `helmet`, pas de CSP/HSTS/X-Frame-Options)

**Impact**

Surface d’attaque web augmentée (clickjacking, MIME sniffing, etc.).

**Correctif recommandé**

Activer `helmet` avec une politique CSP adaptée.

---

## 12) [FAIBLE] Artifacts build + `node_modules` versionnés dans le dépôt

**Preuves**

- `git ls-files` contient `backend-nest/dist/**` et `frontend/node_modules/**`
- Absence de `.gitignore` racine couvrant ces dossiers

**Impact**

Risque de drift de dépendances, confusion en audit, et insertion de code tiers non maîtrisé dans le repo.

**Correctif recommandé**

- Ignorer `dist/`, `node_modules/`, fichiers temporaires à la racine.
- Purger ces artefacts de l’historique opérationnel futur.

---

## Priorités de remédiation (ordre conseillé)

1. Retirer l’auth mock et implémenter une auth forte.
2. Bloquer immédiatement l’escalade via `affectations`.
3. Corriger l’auth des comptes inactifs.
4. Ajouter les contrôles d’accès fins sur routes `:id` + endpoints de recherche/listing.
5. Mettre des bornes anti-DoS (`pageSize`, imports) et corriger les exports CSV.
