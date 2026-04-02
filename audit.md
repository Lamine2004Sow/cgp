# Audit fonctionnel et UX du projet CGP

Date : 1 avril 2026

## 0. Suivi des corrections appliquées

Dernière mise à jour : 2 avril 2026 (session 5)

Corrections déjà appliquées dans le code :

- [x] Écran de connexion aligné sur le mode mock réel.
  - `frontend/src/components/Login.tsx`
  - Le titre n'annonce plus un CAS déjà actif.
  - Le message explique clairement que l'écran utilise des logins de test.
  - Le login administrateur proposé correspond maintenant au seed Docker actuel (`test.administrateur.2`).
  - Liste des logins de test étendue à tous les rôles (22 rôles couverts).
- [x] Actions d'export masquées pour les rôles qui n'y ont pas droit.
  - `frontend/src/components/ImportExport.tsx`
  - Les rôles d'import seuls ne voient plus les boutons d'export qui finissaient en erreur d'autorisation.
- [x] Affichage de l'année source corrigé.
  - `frontend/src/components/YearManagement.tsx`
  - L'écran affiche maintenant la vraie source de duplication quand `id_annee_source` est renseigné.
- [x] Message d'import année -> import CSV réaligné.
  - `frontend/src/components/YearManagement.tsx`
  - Le texte ne parle plus d'un import Excel direct alors que l'écran d'import n'accepte actuellement que le CSV.
- [x] Fiches structures enrichies avec des données composante déjà présentes en base.
  - `backend-nest/src/modules/entites/entites.service.ts`
  - `frontend/src/types.ts`
  - `frontend/src/components/ManageStructures.tsx`
  - Ajout de l'affichage : code composante, type composante, campus, mail fonctionnel, mail institutionnel.
- [x] Mail fonctionnel d'affectation affiché dans les fiches structures.
  - `frontend/src/components/ManageStructures.tsx`
  - Les blocs responsables / secrétariat affichent maintenant les coordonnées fonctionnelles quand elles existent.
- [x] Classement responsable vs secrétariat corrigé sur les fiches structures.
  - `backend-nest/src/modules/entites/entites.service.ts`
  - Les rôles administratifs de direction ne basculent plus automatiquement dans "Secrétariat" uniquement parce qu'ils sont administratifs.
  - La détection "support" repose désormais sur une liste de mots-clés normalisés (`secretariat`, `assistante`, `gestionnaire`…) au lieu du seul flag `est_administratif`.
- [x] Organigramme filtré pour ne plus remonter automatiquement les rôles de support / secrétariat comme responsables.
  - `backend-nest/src/modules/organigrammes/organigrammes.service.ts`
  - Les rôles système (`services-centraux`, `administrateur`, `lecture-seule`, `utilisateur-simple`) et les rôles de support sont maintenant exclus de l'arbre.
  - Le join `role` est désormais inclus dans la requête Prisma pour permettre le filtrage par libellé.
- [x] Gestion des responsables refactorée avec des modales et confirmations cohérentes.
  - `frontend/src/components/ManageResponsibles.tsx`
  - Les formulaires d'ajout, d'édition et d'affectation utilisent maintenant de vraies fenêtres modales (`Dialog` / `AlertDialog` Radix).
  - La suppression d'une fiche et d'une affectation passe maintenant par une confirmation dédiée au lieu de `window.confirm(...)` ou du inline `✓ / ✗`.
  - Filtres recherche, rôle et composante persistés dans l'URL (`mr_q`, `mr_role`, `mr_comp`).
- [x] Champs utilisateur déjà présents en base remontés jusqu'à l'UI.
  - `backend-nest/src/common/types/current-user.ts`
  - `backend-nest/src/auth/auth.service.ts`
  - `backend-nest/src/modules/users/users.service.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/types.ts`
  - `frontend/src/components/ManageResponsibles.tsx`
  - `frontend/src/components/UserProfile.tsx`
  - `genre`, `categorie` et `email_institutionnel_secondaire` sont maintenant visibles côté application.
  - `telephone` et `bureau` passent également dans le token courant (étaient `undefined` avant).
- [x] Composants UI partagés réellement rebranchés côté frontend.
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/components/ui/button.tsx`
  - `frontend/src/components/ui/dialog.tsx`
  - `frontend/src/components/ui/alert-dialog.tsx`
  - Les dépendances nécessaires (`Radix`, `class-variance-authority`, `clsx`, `tailwind-merge`) ont été ajoutées et les imports normalisés.
- [x] Démarrage backend Docker rétabli après correction d'un blocage TypeScript sur l'organigramme.
  - `backend-nest/src/modules/organigrammes/organigrammes.service.ts`
  - Le filtrage des rôles masqués utilise maintenant un `Set<string>` compatible avec la compilation Nest en watch mode.
- [x] Composant `FilterBar` générique créé et déployé sur tous les écrans à filtres.
  - `frontend/src/components/ui/filter-bar.tsx`
  - Remplace les `<select>` inline dupliqués dans ManageStructures, ManageResponsibles, Delegations, AuditLogs, DirectorySearch, ErrorReports.
  - Bouton "Réinitialiser" affiché uniquement quand au moins un filtre est actif.
- [x] Persistance des filtres dans l'URL généralisée.
  - `frontend/src/lib/url-state.ts`
  - Utilitaires `readQueryParam` / `writeQueryParams` centralisés.
  - ManageStructures (`ms_comp`, `ms_type`, `ms_sel`), Delegations (`dg_active`, `dg_comp`), AuditLogs (`au_kind`, `au_target`, `au_user`, `au_action`, `au_start`, `au_end`) ajoutés.
- [x] Formulaire de création de délégation converti en modale overlay.
  - `frontend/src/components/Delegations.tsx`
  - Le formulaire n'occupe plus une zone inline dans la page mais une fenêtre centrée (`fixed inset-0`).
- [x] Seed Docker complété avec les utilisateurs de test manquants.
  - `script/db/init/004_seed_demo.sql`
  - 14 utilisateurs (id 1136–1149) et 14 affectations (id 2143–2156) ajoutés pour couvrir tous les rôles référencés dans l'écran de connexion.
- [x] Bug TypeScript corrigé dans `Delegations.tsx` : icône `Calendar` supprimée des imports mais toujours utilisée.
  - `frontend/src/components/Delegations.tsx`
  - `Calendar` réajouté aux imports Lucide.
- [x] Bug TypeScript corrigé dans `types.ts` : `canRequestCustomRole` générait une erreur TS2345.
  - `frontend/src/types.ts`
  - `.filter().includes(role)` remplacé par `DIRECTION_ROLES.includes(role) && role !== 'services-centraux' && role !== 'administrateur'`.

- [x] Bug TypeScript corrigé dans `Delegations.tsx` : icône `Calendar` supprimée des imports mais toujours utilisée.
  - `frontend/src/components/Delegations.tsx`
  - `Calendar` réajouté aux imports Lucide.
- [x] Bug TypeScript corrigé dans `types.ts` : `canRequestCustomRole` générait une erreur TS2345.
  - `frontend/src/types.ts`
  - `.filter().includes(role)` remplacé par `DIRECTION_ROLES.includes(role) && role !== 'services-centraux' && role !== 'administrateur'`.
- [x] Compteur "Formations" du dashboard corrigé pour refléter la réalité métier.
  - `backend-nest/src/modules/dashboard/dashboard.service.ts`
  - Le compteur agrège maintenant MENTION + PARCOURS + NIVEAU au lieu de dupliquer le count MENTION.
  - Le filtre résiduel `est_administratif: false` supprimé des affectations responsables (redondant avec `NON_RESPONSABLE_ROLES`).
- [x] Liste de rôles dans DirectorySearch décorrélée des résultats courants.
  - `frontend/src/components/DirectorySearch.tsx`
  - Les rôles disponibles dans le filtre sont maintenant chargés depuis `GET /roles` au montage du composant.
  - Un rôle absent de la page courante apparaît quand même dans la liste de filtre.
- [x] Overlay custom de ManageStructures converti en Dialog Radix.
  - `frontend/src/components/ManageStructures.tsx`
  - Le formulaire d'édition utilise maintenant `Dialog` / `DialogContent` / `DialogFooter` comme ManageResponsibles.
  - Fermeture par Escape et gestion du focus gérées par Radix.
- [x] Code dupliqué backend extrait dans un fichier partagé.
  - `backend-nest/src/common/utils/role-support.utils.ts` (nouveau fichier)
  - `SUPPORT_ROLE_HINTS`, `normalizeRoleText` et `isSupportRole` centralisés.
  - `entites.service.ts` et `organigrammes.service.ts` importent depuis ce fichier.
- [x] Libellés sans accents corrigés dans tous les composants.
  - `Delegations.tsx` : "Delegations existantes" → "Délégations existantes", "Annulee" → "Annulée", "Expiree" → "Expirée", "Revoquer" → "Révoquer", "Aucune delegation" → "Aucune délégation", "Selectionner un droit" → "Sélectionner un droit", "Debut:" → "Début :", "Delegant/Delegataire" → "Délégant/Délégataire".
  - `DirectorySearch.tsx` : "Secretariats" → "Secrétariats", "Aucun resultat" → "Aucun résultat" (×4).
  - `UserProfile.tsx` : "Non renseigne" → "Non renseigné", "Non renseignee" → "Non renseignée", "Telephone" → "Téléphone".
  - `ManageResponsibles.tsx` : "Telephone" → "Téléphone" (×2).
  - `ManageRoles.tsx` : "Validee" → "Validée", "Refusee" → "Refusée", "Roles propres a certaines composantes" → "Rôles propres à certaines composantes", accents placeholder corrigés.
- [x] Bouton Révoquer masqué pour les utilisateurs sans droit de révocation.
  - `frontend/src/components/Delegations.tsx`
  - Le bouton n'est visible que pour le délégant lui-même ou les services centraux / administrateur.
  - Prop `canRevoke` passée à `DelegationCard` depuis le composant parent.
- [x] Filtres DirectorySearch refaits et cohérents.
  - `backend-nest/src/modules/search/dto/search-query.dto.ts`
  - `backend-nest/src/modules/search/search.service.ts`
  - `frontend/src/components/DirectorySearch.tsx`
  - Ajout de `entiteIds` (liste d'IDs séparés par virgule, calculée côté frontend à partir de la composante sélectionnée) dans le DTO et dans les 4 endpoints de recherche.
  - Ajout de `typeDiplome` dans le DTO et dans le service `formations`.
  - `typeEntite` branché dans le frontend (existait en backend mais n'était pas utilisé).
  - La prop `entites` reçue par `DirectorySearch` depuis `App.tsx` était ignorée — maintenant utilisée pour construire le filtre composante et le BFS des IDs enfants.
  - Filtre composante disponible sur tous les onglets.
  - Filtre type (MENTION / PARCOURS / NIVEAU) disponible sur l'onglet formations.
  - Filtre type (COMPOSANTE / DEPARTEMENT / MENTION / PARCOURS / NIVEAU) sur l'onglet structures.
  - Filtre diplôme (Licence, Master, BUT, Ingénieur, DU) sur l'onglet formations.
  - Persistance URL étendue : `ds_comp`, `ds_type`, `ds_diplome`.
  - Cartes "Structures" : affichent maintenant le nom de l'entité parente au lieu de l'ID brut.
- [x] `id_affectation` exposé dans `ManageResponsibles` et branché sur la suppression d'affectation individuelle.
  - `frontend/src/components/ManageResponsibles.tsx`
  - `backend-nest/src/modules/users/users.service.ts`
  - `UserRoleRow`, `toUserListItem` et le map `roles` enrichis avec `id_affectation`.
  - Bouton "Supprimer affectation" avec confirmation inline ajouté par affectation.
  - Filtre par composante (`filterComposante`) persisté dans l'URL (`mr_comp`).
- [x] Champ `superviseur` (N+1) exposé en GET et modifiable en PATCH sur les affectations.
  - `backend-nest/src/modules/affectations/affectations.service.ts`
  - `backend-nest/src/modules/affectations/affectations.controller.ts`
  - `id_affectation_n_plus_1` visible et éditable depuis l'UI M2.
- [x] Frontend Dockerfile corrigé pour un build Docker reproductible.
  - `frontend/Dockerfile`
  - Ajout du `COPY package-lock.json` et passage de `npm install` à `npm ci`.
  - Avant : install non déterministe (versions potentiellement différentes à chaque build).
- [x] Filtres par codes métier ajoutés sur toute l'application.
  - `backend-nest/src/modules/entites/entites.service.ts` — `list()` remonte `code_composante`
  - `backend-nest/src/modules/search/search.service.ts` — recherche étendue à `login`, `code_composante`, `code_interne`, `code_parcours`, `libelle_court`
  - `frontend/src/types.ts` — `code_composante` ajouté à `EntiteStructure`
  - `frontend/src/components/DirectorySearch.tsx` — dropdown composante affiche "Nom (CODE)", placeholder étendu, badge code sur les cartes structures
  - `frontend/src/components/ManageResponsibles.tsx` — dropdown composante affiche "Nom (CODE)", filtre texte couvre le code composante via la hiérarchie
- [x] Imports UI corrigés + `package.json` complété.
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/components/ui/*.tsx`
  - Les imports versionnés `@radix-ui/*@x.y.z` ont été normalisés et les dépendances manquantes (`Radix`, `recharts`, `cmdk`, `vaul`, `sonner`, `react-hook-form`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `react-resizable-panels`, `next-themes`, `date-fns`) sont désormais déclarées.
- [x] `type_signalement` validé par enum stricte côté backend.
  - `backend-nest/src/modules/demandes/dto/create-signalement.dto.ts`
  - `CreateSignalementDto` refuse maintenant toute valeur hors liste (`ERREUR_INFO_PERSONNE`, `MAUVAISE_AFFECTATION`, `ERREUR_STRUCTURE`, `ERREUR_MENTION`, `AUTRE`).
- [x] Seeds de démonstration complétés avec un N+1 hiérarchique.
  - `script/db/init/004_seed_demo.sql`
  - `script/annuaire_seed.sql`
  - `backend-nest/prisma/seed.ts`
  - `id_affectation_n_plus_1` est maintenant renseigné dans les données de démo pour fournir une chaîne hiérarchique exploitable.

## 0.1 Points de vigilance en suspens

- **Détection "support" par label** : la logique `isSupportRole` repose sur des mots-clés en dur dans `role-support.utils.ts`. Si un rôle secrétariat a un libellé atypique en base, il sera classé comme responsable. À surveiller lors de l'import de données réelles.
- **AuditLogs — filtre `targetKind` non envoyé à l'API** : dans `AuditLogs.tsx`, le state `filters.targetKind` ("user"/"entite") est utilisé uniquement pour choisir quel sélecteur afficher ; il n'est pas transmis à l'endpoint `/audit`. Le filtre effectif repose uniquement sur `targetId`. Aucun faux positif si les IDs utilisateurs et entités n'ont pas de collision (séquences séparées), mais à surveiller si on ajoute un filtre `cible_type` strict côté backend.
- **N+1 hiérarchique** : les seeds remplissent maintenant `id_affectation_n_plus_1`, mais l’organigramme backend/frontend ne l’utilise pas encore pour enrichir l’arbre fonctionnel au-delà de la hiérarchie des entités.

## 1. Périmètre et sources utilisées

Cet audit a été construit en croisant :

- `files/assets/Annuaire.xlsx`
- `files/assets/Compte rendu détaillé – Réunion Sprint 4 (1).pdf`
- `files/assets/reunion sprint 4 audit.docx`
- `files/Sprint1.pdf`
- `files/Sprint2.pdf`
- `files/CGP_Groupe1_Sprint3-1.pdf`
- le code frontend (`frontend/src`)
- le code backend (`backend-nest/src`, `backend-nest/prisma`)
- les scripts de seed/import (`script/seed_annuaire.py`, `script/annuaire_seed.sql`, `backend-nest/prisma/seed-from-csv.ts`, `script/db/init/*.sql`)

Point important :

- `backend-nest/files` est vide dans l’état actuel du repo.
- La vraie source métier exploitable est donc dans `files/` et surtout `files/assets/`.
- La lecture de `Annuaire.xlsx` via `script/seed_annuaire.py` montre déjà un référentiel exploitable avec :
  - 9 composantes
  - 2 feuilles de données métier présentes dans ce fichier (`903-IG`, `925-IUTB`)
  - 149 utilisateurs
  - 204 affectations
  - 63 contacts de rôle

## 2. Synthèse exécutive

L’application a une base technique correcte : architecture Docker, frontend React, backend NestJS, modules d’audit, signalements, délégations, organigrammes, et une première modélisation des entités. En revanche, elle n’est pas encore alignée avec la réalité métier décrite dans `Annuaire.xlsx` et confirmée en Sprint 4.

Le problème principal n’est pas seulement “quelques écrans qui bugguent”. Le vrai blocage est plus profond :

- la source de vérité métier n’est pas réellement branchée au démarrage de l’application ;
- le modèle de données reste trop générique pour représenter proprement cycles, années, parcours, spécialités, N+1 et responsabilités transverses ;
- plusieurs champs déjà présents en base ne remontent ni dans l’API ni dans l’UI ;
- les validations métier demandées en Sprint 4 ne sont pas implémentées ;
- une partie de l’UX affiche des actions non réellement supportées ou mal cadrées.

Conclusion :

- il faut stopper les corrections “au coup par coup” uniquement côté UI ;
- il faut d’abord réaligner la donnée, les règles métier et les flux d’import ;
- ensuite seulement, reprendre les écrans et les modales sur une base saine.

## 3. État global par domaine

| Domaine | État | Commentaire |
| --- | --- | --- |
| Source de données métier | Critique | `Annuaire.xlsx` n’est pas la source runtime réelle |
| Modèle métier / hiérarchie | Critique | encore trop plat et trop générique |
| Rôles / affectations / N+1 | Critique | partiellement modélisés, peu validés |
| Emails / alertes / RGPD | Critique | champs partiels, règles absentes |
| Import / export | Haute | import peu utilisable par le métier |
| Création d’année | Haute | duplication globale, pas par composante |
| Organigrammes | Haute | techniquement présents, métier inexact |
| Recherche / filtres | Haute | manque de filtres en cascade |
| Fiches structures / responsables | Haute | beaucoup d’informations métier non visibles |
| Modales / cohérence UX | Moyenne à haute | implémentations dupliquées et peu robustes |
| Auth mock / comptes de test | Moyenne | confusion entre CAS réel et mode mock |
| DevEx / build local | Moyenne | backend non exécutable localement dans ce workspace sans réinstaller les deps |

## 4. Constats détaillés

### 4.1 La source de vérité métier n’est pas branchée au runtime

Constat :

- `docker-compose.yml` initialise Postgres avec `script/db/init`.
- Le backend Docker lance ensuite `prisma/docker-init.ts`.
- `prisma/docker-init.ts` ne seed que si la base est vide.
- Comme `script/db/init/004_seed_demo.sql` peuple déjà la base, le seed backend est généralement ignoré.
- Le seed backend prévu (`backend-nest/prisma/seed-from-csv.ts`) attend des fichiers `structures.csv`, `responsables.csv`, `secretariat.csv`.
- Ces CSV n’existent pas dans le repo.
- `files/assets/Annuaire.xlsx` n’est donc pas la donnée réellement utilisée au démarrage.
- `script/seed_annuaire.py` et `script/annuaire_seed.sql` montrent pourtant qu’un pipeline Annuaire -> SQL existe déjà, mais il n’est pas branché au boot.

Impact :

- les données vues dans l’application peuvent diverger de `Annuaire.xlsx` ;
- les comptes de test, structures et affectations peuvent varier selon le mode de seed utilisé ;
- on corrige parfois l’UI sur des données de démonstration qui ne reflètent pas la réalité métier.

À retenir :

- tant que la donnée métier n’est pas la donnée réellement injectée, toute correction UI risque d’être trompeuse.

### 4.2 Le modèle de données reste trop générique pour le métier réel

Constat :

- `entite_structure` ne distingue que `COMPOSANTE`, `DEPARTEMENT`, `MENTION`, `PARCOURS`, `NIVEAU`.
- Or les documents métier demandent explicitement une lecture plus fine :
  - type de diplôme
  - cycle
  - année de formation
  - spécialité ingénieur
  - responsabilités transverses
  - N+1 hiérarchique métier
- Le schéma actuel n’a pas de table dédiée pour :
  - `cycle`
  - `annee_formation`
  - `specialite`
  - `responsabilite_transverse`
  - `conseil_perfectionnement`
  - `membre_conseil`
  - `action_conseil`
- `mention` porte seulement `type_diplome`, `cycle` et `id_type_diplome`.
- `parcours` ne porte que `code_parcours`.
- `NIVEAU` sert aujourd’hui de fourre-tout pour L1, M1, BUT1, CP2I, ING1, etc.
- `code_etape` n’existe pas dans le schéma Prisma.
- `personne_externe` existe bien dans Prisma, mais sans module métier ni UI.

Impact :

- la hiérarchie réelle IG/IUT/BUT/ING n’est pas proprement représentée ;
- l’organigramme et la recherche ne peuvent pas être précis ;
- les futurs modules métier seront très difficiles à greffer proprement.

Nuance importante :

- le projet a déjà commencé à intégrer certaines notions Sprint 4 (`type_diplome`, `personne_externe`, `id_affectation_n_plus_1`) ;
- mais l’intégration reste incomplète et non exploitée bout en bout.

### 4.3 Des champs métier existent déjà en base mais sont perdus dans l’API et l’interface

Constat côté utilisateurs :

- `utilisateur` contient :
  - `genre`
  - `categorie`
  - `email_institutionnel_secondaire`
  - `telephone`
  - `bureau`
- pourtant `UsersService` et les DTO exposent seulement :
  - `nom`
  - `prenom`
  - `email_institutionnel`
  - `telephone`
  - `bureau`
- `ManageResponsibles` et `UserProfile` ne permettent pas d’exploiter :
  - civilité / genre
  - catégorie de personnel
  - autre mail institutionnel

Constat côté composantes / structures :

- `composante` contient :
  - `code_composante`
  - `type_composante`
  - `mail_fonctionnel`
  - `mail_institutionnel`
  - `campus`
  - `site_web`
- mais `EntitesService` n’expose, pour une composante, que `site_web`.
- le frontend `ManageStructures` ne montre ni code composante, ni campus, ni mails, ni fonction du directeur.

Constat côté affectations :

- `contact_role` existe pour porter l’email fonctionnel, le téléphone et le bureau liés à une fonction ;
- ces données sont très peu visibles dans l’UI ;
- `ManageStructures` affiche l’email institutionnel de la personne, mais pas le mail fonctionnel de l’affectation alors que c’est une donnée clé du besoin.

Impact :

- une partie importante du travail déjà présent en base n’est pas valorisée ;
- l’utilisateur a l’impression que l’application “ne sait pas gérer” des champs qui sont en réalité déjà stockés.

### 4.4 Les règles métier sur les rôles ne sont pas sécurisées

Constat :

- `AffectationsService` crée et met à jour des affectations sans validation métier forte sur :
  - enseignant vs administratif
  - rôle autorisé selon catégorie
  - cohérence avec le type d’entité
- `ImportsService` vérifie seulement :
  - existence de l’entité
  - existence de l’année
  - existence du rôle
- aucune règle Sprint 4 du type A1, A2, A3, A4, A7, A9, A10 n’est implémentée.

Bug métier très concret :

- dans `EntitesService`, un rôle est considéré “responsable” uniquement si `est_administratif === false`.
- conséquence : un directeur administratif ou un responsable pédagogique administratif peut être affiché dans le bloc “Secrétariat” au lieu d’être traité comme un responsable métier.
- ce point contredit directement les documents qui indiquent que chaque composante a obligatoirement un directeur de composante et un DA.

Deuxième bug métier concret :

- `OrganigrammesService` attache toutes les affectations d’une entité dans `responsables`.
- il ne filtre pas les rôles d’administration, de secrétariat ou de lecture.
- résultat : l’organigramme peut présenter comme “responsables” des affectations qui ne devraient pas l’être.

Impact :

- on retrouve précisément le type d’erreur relevé en réunion Sprint 4 ;
- l’application laisse passer des incohérences qu’elle devrait justement empêcher.

### 4.5 Les alertes Sprint 4 ne sont pas implémentées

Constat :

- aucun moteur d’alertes automatiques A1 à A10 n’existe dans le backend ;
- il existe un module `signalements`, mais il s’agit d’un flux manuel ;
- il n’y a pas :
  - d’alerte bloquante sur un administratif affecté à un rôle enseignant
  - d’alerte sur responsable vide
  - d’alerte sur secrétariat manquant
  - d’alerte sur mail fonctionnel absent ou non institutionnel
  - d’alerte RGPD sur téléphone personnel
- `CreateSignalementDto` accepte `type_signalement` comme simple string, sans enum stricte côté validation.

Impact :

- les écarts remontent après coup, au lieu d’être évités à la saisie ou à l’import ;
- le module de signalement compense un manque de validation au lieu de compléter un système déjà robuste.

### 4.6 Les règles emails du besoin ne sont pas couvertes

Constat :

- le modèle distingue déjà en partie :
  - mail institutionnel principal
  - autre mail institutionnel
  - mail fonctionnel via `contact_role`
- mais il n’existe pas de validation métier sur :
  - whitelist des domaines institutionnels
  - rejet des domaines personnels
  - obligation de `@univ-paris13.fr` pour le mail fonctionnel
  - alerte si le mail fonctionnel manque pour un poste qui devrait en avoir un

Impact :

- l’application ne protège pas la qualité de la donnée sur un point explicitement demandé par les clientes.

### 4.7 Le N+1 hiérarchique est prévu mais pas réellement exploité

Constat :

- `affectation.id_affectation_n_plus_1` existe dans Prisma ;
- `AffectationsService` sait techniquement le manipuler ;
- mais ni l’import métier principal, ni le seed Annuaire généré, ni les écrans principaux ne le mettent vraiment en œuvre ;
- `script/annuaire_seed.sql` ne remplit pas `id_affectation_n_plus_1`.

Impact :

- impossible de produire un organigramme ou une chaîne hiérarchique fidèle au besoin ;
- le champ existe, mais il ne joue pas encore son rôle fonctionnel.

### 4.8 Le flux d’import n’est pas utilisable par un utilisateur métier

Constat UX :

- `ImportExport` refuse les `.xlsx` et n’accepte que le `.csv`.
- le texte d’interface parle encore de CSV ou Excel selon les écrans, ce qui crée une ambiguïté.
- les colonnes obligatoires exigent :
  - `id_role`
  - `id_entite`
  - `id_annee`
- ce format est technique, pas métier.
- un utilisateur métier devrait importer via des clés compréhensibles :
  - code composante
  - département
  - mention
  - parcours
  - type
  - rôle
- aucun template téléchargeable n’est fourni.
- il n’existe pas de flow d’import direct depuis `Annuaire.xlsx`.

Constat backend :

- `ImportsService` sait faire une preview et confirmer un import ;
- mais il travaille sur des lignes déjà “normalisées techniquement”, pas sur un fichier métier brut.

Impact :

- le module d’import est surtout utilisable par quelqu’un qui connaît déjà les IDs internes ;
- ce n’est pas acceptable comme flux métier cible.

### 4.9 L’export est incohérent selon le rôle

Constat :

- côté API, `GET /exports/responsables` est réservé aux services centraux.
- côté frontend, le bloc “Exporter les données” reste affiché même aux rôles qui n’ont pas ce droit.
- résultat : l’utilisateur voit des boutons qu’il ne peut pas réellement utiliser.

Impact :

- frustration UX ;
- impression de bug ou de permission cassée ;
- interface non alignée avec les règles d’accès.

### 4.10 La création d’année ne correspond pas au besoin Sprint 4

Constat :

- `AnneesService.cloneYear` duplique toute l’année source.
- il n’existe pas d’option de duplication composante par composante.
- il n’existe pas de mix “certaines composantes vides, d’autres pleines”.
- la copie ne reprend pas :
  - `contact_role`
  - `id_affectation_n_plus_1`
  - les délégations
- côté frontend, `YearManagement` propose seulement “recopier les affectations” oui/non.
- le tableau ne remonte pas correctement la source : il affiche surtout “Année courante” ou `-`, alors que l’API renvoie `id_annee_source`.

Impact :

- la fonctionnalité répond à un besoin simplifié, pas au besoin réel exprimé ;
- les données clonées perdent une partie des détails métier.

### 4.11 Recherche et filtres : trop peu de finesse et quelques bugs UX

Constat :

- `DirectorySearch` ne propose pas de filtres en cascade par :
  - composante
  - type de diplôme
  - département
  - mention
  - parcours
  - niveau / année
- le filtre de rôle des responsables est construit à partir des résultats courants.
- donc un rôle absent de la page ou de la requête courante n’apparaît même pas dans la liste de filtre.
- la recherche exploite surtout :
  - texte libre
  - rôle
  - type d’entité

Impact :

- la recherche est praticable pour des démonstrations simples ;
- elle n’est pas assez fine pour les usages métier réels décrits dans `Annuaire.xlsx`.

### 4.12 Fiches structures et fiches responsables : trop de données invisibles

Constat :

- `ManageStructures` affiche :
  - nom
  - téléphone / bureau du service
  - site web ou quelques champs spécifiques
- mais pas :
  - code composante
  - campus
  - type composante
  - fonction du directeur
  - mails fonctionnels
  - autre mail institutionnel
  - civilité
  - catégorie de personnel
  - N+1
- `ManageResponsibles` affiche seulement nom, email, téléphone, bureau et affectations.
- il manque donc une grande partie des colonnes métier demandées.

Impact :

- les écrans sont “propres” mais pas assez riches ;
- l’utilisateur doit encore sortir de l’application pour retrouver les informations clés.

### 4.13 Organigrammes : base technique présente, rendu métier insuffisant

Constat positif :

- génération, historique, figer et export PDF/CSV/JSON existent.

Constat fonctionnel :

- la construction d’arbre repose uniquement sur `entite_structure` parent/enfant ;
- l’algorithme n’exploite pas le N+1 métier ;
- le rendu ne distingue pas clairement :
  - cycle
  - type de diplôme
  - année
  - spécialité
  - responsabilité transverse
- les exports PDF sont techniques mais encore génériques.

Impact :

- le module donne une impression de fonctionnalité “présente” ;
- mais il ne reflète pas encore la hiérarchie réelle attendue par les clientes.

### 4.14 Les modales et confirmations sont à refaire proprement

Constat :

- plusieurs écrans implémentent des overlays “maison” en dupliquant du markup `fixed inset-0 z-50`.
- c’est le cas notamment dans :
  - `ManageResponsibles`
  - `ManageStructures`
  - `Delegations`
  - `ErrorReports`
- le repo contient pourtant déjà des composants UI partagés :
  - `frontend/src/components/ui/dialog.tsx`
  - `frontend/src/components/ui/alert-dialog.tsx`
  - `frontend/src/components/ui/sheet.tsx`
- les confirmations sont incohérentes selon les écrans :
  - `window.confirm(...)`
  - boutons inline `✓ / ✗`
  - overlays custom

Problèmes UX probables :

- pas de gestion homogène du focus ;
- pas d’escape / fermeture standardisée ;
- accessibilité clavier incertaine ;
- maintenance coûteuse car chaque écran recopie sa propre modale.

Impact :

- la sensation de qualité UI est dégradée ;
- les modales deviennent rapidement une source de bugs.

### 4.15 Connexion : l’écran parle de CAS, mais l’application tourne en mock

Constat :

- le backend fonctionne en `AUTH_MODE=mock` par défaut.
- `MockAuthGuard` attend un header `x-user-login`.
- l’écran `Login` affiche “Authentification CAS”.
- l’expérience réelle est donc une simulation de login par saisie de login.

Autre problème :

- les logins proposés par `Login.tsx` ne correspondent pas tous aux différents seeds possibles.
- Docker s’appuie surtout sur `script/db/init/004_seed_demo.sql`.
- `npm run seed` et `seed-from-csv.ts` utilisent d’autres comptes de démonstration.

Impact :

- confusion pour l’utilisateur et pour les testeurs ;
- connexions qui “devraient marcher” mais qui dépendent en réalité du seed actif.

### 4.16 Quelques incohérences produit supplémentaires

Constat :

- `DashboardService` renvoie `formations: mentionCount`, donc le compteur “formations” ne reflète pas réellement les parcours/niveaux.
- `YearManagement` annonce un import “CSV ou Excel”, alors que `ImportExport` refuse les `.xlsx`.
- le projet contient déjà `script/seed_annuaire.py`, mais ce pipeline n’est pas assumé officiellement dans le README ni branché au démarrage.

## 5. Ce qui est déjà bien engagé

Il y a plusieurs briques à conserver :

- architecture Docker simple à lancer ;
- séparation frontend / backend claire ;
- modules d’audit, délégations, signalements déjà présents ;
- persistance d’état des filtres dans l’URL sur plusieurs écrans ;
- base Prisma déjà enrichie par plusieurs notions Sprint 4 :
  - `type_diplome`
  - `genre`
  - `categorie`
  - `email_institutionnel_secondaire`
  - `personne_externe`
  - `id_affectation_n_plus_1`
- script `Annuaire.xlsx -> SQL` déjà existant, donc le chantier de réalignement n’est pas à partir de zéro.

## 6. Priorités recommandées

### P0 — À traiter avant toute grosse retouche cosmétique

1. Unifier la source de vérité de données.
2. Valider le modèle métier cible à partir de `Annuaire.xlsx`.
3. Reprendre la hiérarchie métier : cycle, année, spécialité, transverse, N+1.
4. Implémenter les validations métier sur rôles, emails et affectations.
5. Refaire le flux d’import pour accepter un format métier réel.

### P1 — À traiter juste après

1. Corriger les écrans principaux : structures, responsables, recherche, organigramme.
2. Exposer les champs déjà stockés en base mais invisibles.
3. Remplacer les modales custom par les composants UI partagés.
4. Corriger les permissions visibles côté UI.
5. Revoir la création d’année par composante.

### P2 — À traiter ensuite

1. Finitions organigramme PDF.
2. Charte graphique USPN.
3. Module conseils de perfectionnement.
4. Stabilisation tests / build / doc d’exploitation.

## 7. Quick wins recommandés

Ces corrections ont un bon ratio impact / effort :

- masquer le bloc d’export aux rôles non autorisés ;
- corriger l’écran de login pour assumer le mode mock ;
- afficher le mail fonctionnel dans les fiches structures ;
- ne plus classer automatiquement tous les rôles administratifs dans “Secrétariat” ;
- remplacer `window.confirm` et les confirmations inline par `AlertDialog` ;
- afficher `id_annee_source` correctement dans `YearManagement` ;
- harmoniser le message “CSV ou Excel” avec le comportement réel.

## 8. TODO détaillé

### Donnée / seed

- [ ] Choisir une seule source de vérité de seed pour le projet.
- [ ] Brancher le démarrage Docker sur une donnée métier réelle et non sur un seed de démo divergent.
- [ ] Décider officiellement si la source de référence est `Annuaire.xlsx`, des CSV dérivés, ou `script/annuaire_seed.sql`.
- [ ] Documenter le flux de seed dans le README.
- [ ] Supprimer les ambiguïtés entre `script/db/init/004_seed_demo.sql`, `prisma/seed.ts`, `prisma/seed-from-csv.ts` et `script/annuaire_seed.sql`.

### Modèle de données

- [ ] Ajouter une modélisation explicite du cycle.
- [ ] Ajouter une modélisation explicite de l’année de formation.
- [ ] Ajouter `code_etape`.
- [ ] Ajouter une modélisation explicite des spécialités ingénieur.
- [ ] Ajouter une modélisation explicite des responsabilités transverses.
- [ ] Ajouter les tables du module conseils de perfectionnement.
- [ ] Réviser la relation entre composante et types de diplômes.
- [ ] Supprimer les doublons conceptuels entre champs string libres et tables de référence quand c’est possible.

### Utilisateurs / rôles / affectations

- [x] Exposer `genre` dans l’API et l’UI.
- [x] Exposer `categorie` dans l’API et l’UI.
- [x] Exposer `email_institutionnel_secondaire`.
- [x] Exposer les mails fonctionnels liés aux affectations (`contact_role`).
- [x] Renseigner `id_affectation_n_plus_1` dans les seeds et l’API.
- [ ] Afficher le N+1 dans les fiches et l’organigramme.
- [x] Corriger la classification “responsable” vs “secrétariat” (détection par label, suppression du flag `est_administratif`).
- [ ] Ajouter les validations métier enseignant / administratif selon le rôle.

### Emails / alertes / RGPD

- [ ] Whitelister les domaines institutionnels autorisés.
- [ ] Bloquer les domaines personnels pour les mails institutionnels et fonctionnels.
- [ ] Exiger `@univ-paris13.fr` pour le mail fonctionnel.
- [ ] Ajouter l’alerte RGPD sur la saisie d’un téléphone personnel.
- [ ] Implémenter les alertes A1 à A10 du Sprint 4.

### Import / export

- [ ] Permettre un import depuis un format métier lisible.
- [ ] Fournir un template téléchargeable.
- [ ] Permettre un import direct depuis `Annuaire.xlsx` ou un format dérivé officiel.
- [ ] Supprimer l’exigence d’IDs techniques dans le fichier utilisateur.
- [ ] Ajouter les validations métier au moment de la preview.
- [x] Afficher côté UI uniquement les exports autorisés pour le rôle courant.

### Années universitaires

- [ ] Permettre la duplication composante par composante.
- [ ] Permettre un mix année vide / année pleine selon la composante.
- [ ] Copier aussi `contact_role` lors d’un clonage si c’est le comportement attendu.
- [ ] Copier aussi les relations N+1 si on clone une année.
- [x] Afficher correctement l’année source dans `YearManagement`.

### Recherche / fiches / organigrammes

- [x] Ajouter des filtres composante / type / diplôme dans DirectorySearch (backend + frontend).
- [ ] Filtres en cascade stricts : composante -> département -> mention -> parcours (sélection dépendante des résultats du niveau supérieur).
- [x] Décorréler la liste des rôles de filtre des résultats courants (chargé depuis GET /roles).
- [x] Enrichir `ManageStructures` avec les champs métier manquants (code composante, campus, mails, type composante).
- [x] Enrichir `ManageResponsibles` avec les champs métier manquants (genre, catégorie, email secondaire).
- [ ] Refaire l’organigramme pour refléter la hiérarchie réelle et non uniquement l’arbre générique.
- [ ] Utiliser le N+1 pour compléter la hiérarchie quand nécessaire.
- [x] Corriger les compteurs de dashboard pour qu’ils reflètent la réalité métier (MENTION+PARCOURS+NIVEAU, suppression filtre est_administratif).

### UX / modales

- [x] Remplacer les overlays custom par `Dialog` / `AlertDialog` (ManageResponsibles, Delegations).
- [x] Uniformiser les confirmations de suppression (ManageResponsibles).
- [x] Garantir focus, fermeture clavier et accessibilité sur les modales (ManageResponsibles + ManageStructures via Radix Dialog).
- [x] Éviter les actions visibles mais interdites (Delegations : Révoquer masqué si non autorisé).
- [x] Harmoniser les libellés entre les écrans (accents, casse, terminologie).

### Auth / comptes de test

- [x] Renommer l’écran de connexion tant que le CAS réel n’est pas branché ("Connexion de développement").
- [x] Aligner les boutons de login sur le seed réellement utilisé (22 rôles couverts).
- [x] Documenter clairement les comptes de test valides selon le mode de démarrage (bandeau d’avertissement dans Login.tsx).
- [ ] Préparer le futur branchement CAS sans entretenir la confusion avec le mock actuel.

### DevEx / qualité

- [ ] Stabiliser le build backend local.
- [ ] Stabiliser les tests backend locaux.
- [ ] Ajouter un smoke test minimal des écrans critiques.
- [ ] Documenter les scénarios fonctionnels de recette à partir de `Annuaire.xlsx`.

## 10. Pages et modules absents — à créer ou à reconstruire

Ces manques ont été identifiés en croisant le code existant, les documents Sprint 4 et `Annuaire.xlsx`.

### 10.1 Module Personnes externes — absent

Constat :
- `personne_externe` existe dans Prisma (nom, prénom, email, organisation, fonction).
- Aucun module NestJS (`PersonnesExternesModule`), aucun contrôleur, aucune route.
- Aucun écran frontend, aucun type TypeScript exposé.
- Pourtant les docs Sprint 4 mentionnent des contacts externes (jurys, intervenants, conseils).

Pourquoi c'est un problème :
- La table existe mais est inutilisée et invisible côté application.
- On ne peut pas gérer ni afficher les membres externes d'un conseil de perfectionnement.

À faire :
- [ ] Créer `backend-nest/src/modules/personnes-externes/` (CRUD minimal, filtre par organisation/fonction).
- [ ] Exposer dans `GET /personnes-externes` avec pagination.
- [ ] Créer une page frontend "Personnes externes" accessible aux SC et directeurs.

### 10.2 Module Conseils de perfectionnement — absent

Constat :
- Mentionné explicitement dans les documents de Sprint 4 et Sprint 3.
- Aucune table Prisma dédiée (`conseil_perfectionnement`, `membre_conseil`, `action_conseil`).
- Aucun module backend, aucun écran frontend.
- Le module `signalements` ne couvre pas du tout ce besoin.

Pourquoi c'est un problème :
- C'est une fonctionnalité explicitement demandée par les clientes.
- Sans modèle de données dédié, le module est impossible à greffer proprement.

À faire :
- [ ] Ajouter les tables Prisma : `conseil_perfectionnement`, `membre_conseil`, `action_conseil`.
- [ ] Créer `backend-nest/src/modules/conseils/` (CRUD + membres).
- [ ] Créer une page frontend "Conseils de perfectionnement" (liste, fiche, membres, actions).

### 10.3 Gestion du N+1 hiérarchique — table présente, UI absente

Constat :
- `affectation.id_affectation_n_plus_1` existe en Prisma.
- `AffectationsService` le lit et le retourne dans `GET /affectations/:id`.
- Mais aucun écran ne permet de visualiser ni de modifier le N+1 d'une affectation.
- L'organigramme n'en tient pas compte.

Pourquoi c'est un problème :
- La hiérarchie responsable N / N+1 est un besoin métier explicite.
- Sans UI, le champ est stocké mais jamais alimenté correctement (il l'est déjà partiellement via PATCH mais pas de façon guidée).

À faire :
- [ ] Afficher le superviseur N+1 dans la fiche d'une affectation (ManageResponsibles ou détail affectation).
- [ ] Permettre de sélectionner/modifier le N+1 dans un formulaire d'affectation.
- [ ] Utiliser le N+1 dans la construction de l'organigramme.

### 10.4 Code composante et code diplôme — stockés mais jamais filtrables

Constat :
- `composante.code_composante` existe en base.
- `entite_structure` (mention) porte `type_diplome` et `code_interne`.
- `parcours` porte `code_parcours`.
- Ces codes sont connus des gestionnaires métier (ex : "903-IG", "925-IUTB").
- Aucun filtre, aucune recherche, aucun affichage de ces codes dans l'annuaire ou les fiches.

Pourquoi c'est un problème :
- Les utilisateurs métier naviguent par code composante, pas par nom complet.
- L'import/export doit correspondre à ces codes pour être utilisable.
- Actuellement le filtre diplôme dans DirectorySearch est une liste statique (Licence, Master…) non alignée sur les vrais types stockés en base.

À faire :
- [ ] Exposer `code_composante` dans la recherche et les fiches structures.
- [ ] Afficher `code_parcours` et `code_interne` dans les fiches formations.
- [ ] Charger les vraies valeurs `type_diplome` depuis `GET /entites` au lieu d'une liste statique dans DirectorySearch.
- [ ] Permettre la recherche par code composante dans la barre de recherche globale.

### 10.5 ImportExport — format non utilisable par un métier

Constat (déjà partiellement dans 4.8) :
- Aucun template CSV téléchargeable.
- Les colonnes exigent des IDs techniques internes.
- Aucun support XLSX malgré la mention dans certains textes UI.
- L'écran de preview ne valide pas les règles métier (catégorie, rôle compatible, mail institutionnel…).

À faire :
- [ ] Fournir un template CSV téléchargeable avec colonnes métier (code composante, code rôle libellé, nom, prénom, email).
- [ ] Ajouter la validation métier à la preview (catégorie enseignant vs administratif, domaine email, rôle autorisé).
- [ ] Décider officiellement si XLSX sera supporté et documenter la décision.

### 10.6 Dashboard — indicateurs incomplets

Constat :
- Le dashboard affiche : formations, responsables, départements, composantes.
- Il manque :
  - nombre de délégations actives
  - nombre de signalements ouverts
  - nombre d'affectations sans N+1
  - nombre d'alertes A1-A10 actives (quand ce module existera)

À faire :
- [ ] Enrichir `DashboardService` avec : délégations actives, signalements ouverts.
- [ ] Ajouter une section "Alertes" sur le dashboard quand des incohérences sont détectées.

### 10.7 NotificationBell — backend présent mais notifications non alimentées

Constat :
- `NotificationBell.tsx` appelle `GET /notifications` et `PATCH /notifications/:id/read`.
- Le module `backend-nest/src/modules/notifications/` existe avec contrôleur et service.
- Le frontend gère les erreurs silencieusement (catch vide) donc pas de crash.
- Problème : aucun mécanisme ne crée des notifications côté backend (ni depuis les signalements, ni depuis les alertes, ni depuis les délégations).

Pourquoi c'est un problème :
- La cloche est toujours vide, ce qui donne l'impression d'un composant mort.
- Le polling toutes les 60 secondes crée des requêtes inutiles.

À faire :
- [ ] Alimenter les notifications depuis les événements métier (nouvelle délégation reçue, signalement répondu, etc.).
- [ ] En attendant, ce composant est fonctionnel mais inerte — pas urgent.

### 10.8 ErrorReports (Signalements) — modales custom à remplacer

Constat :
- `ErrorReports.tsx` utilise encore des overlays custom (`fixed inset-0 z-50`) au lieu de `Dialog` Radix.
- Incohérent avec ManageResponsibles et ManageStructures qui utilisent Radix.

À faire :
- [ ] Remplacer les overlays custom d'ErrorReports par `Dialog` / `AlertDialog` Radix.

## 9. Recommandation finale

Le bon ordre de travail n’est pas “corriger d’abord les modales puis peaufiner l’UI”. Le bon ordre est :

1. brancher la bonne donnée ;
2. figer le bon modèle métier ;
3. sécuriser les validations métier ;
4. corriger les écrans sur cette base ;
5. finir l’habillage et les améliorations UX.

Tant que l’étape 1 à 3 n’est pas proprement faite, l’application continuera à donner l’impression que “plein de trucs ne fonctionnent pas comme ils devraient”, même si certains écrans sont refaits visuellement.
