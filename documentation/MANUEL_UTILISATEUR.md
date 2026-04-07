# Manuel d'utilisation

## 1. Objectif

Ce manuel explique comment utiliser l'application CGP au quotidien.

Il est destiné:

- aux utilisateurs qui consultent l'annuaire
- aux responsables qui gèrent leur périmètre
- aux services centraux qui pilotent les années, les imports et les organigrammes

Il complète la documentation technique, mais il reste orienté usage métier et parcours écran.

## 2. Convention pour les captures d'écran

Les captures utilisateur doivent être rangées dans `documentation/captures/`.

Convention recommandée:

- format: `png`
- largeur homogène si possible
- une capture par écran ou par action clé
- masquer les données personnelles réelles si nécessaire
- utiliser de préférence une année de démonstration stable

Convention de nommage:

- `01-connexion.png`
- `02-tableau-de-bord.png`
- `03-recherche-responsables.png`
- `04-recherche-structures.png`
- `05-fiche-structure.png`
- `06-organigramme-structures.png`
- `07-organigramme-personnes.png`
- `08-bibliotheque-organigrammes.png`
- `09-import-export.png`
- `10-preview-import.png`
- `11-gestion-annees.png`
- `12-responsables.png`
- `13-delegations.png`
- `14-demandes-roles.png`
- `15-signalements.png`
- `16-audit.png`
- `17-profil.png`

## 3. Démarrage

### 3.1 Connexion

À l'ouverture de l'application, l'utilisateur arrive sur l'écran de connexion.

En environnement actuel:

- la connexion se fait via un login
- l'application recharge ensuite le profil, l'année et les droits associés

Capture à insérer:

- fichier: `documentation/captures/01-connexion.png`
- montrer: l'écran de connexion avec le champ login et le bouton de validation
- cadrage conseillé: toute la carte de connexion

### 3.2 Tableau de bord

Après connexion, l'utilisateur arrive sur le tableau de bord.

Le tableau de bord permet de:

- voir rapidement les accès disponibles
- rejoindre les principales fonctionnalités
- identifier l'année courante active dans la session

Capture à insérer:

- fichier: `documentation/captures/02-tableau-de-bord.png`
- montrer: la page d'accueil après connexion avec les cartes principales
- cadrage conseillé: en-tête + premières cartes du tableau de bord

### 3.3 Changer d'année universitaire

Le changement d'année se fait depuis le sélecteur d'année visible dans l'application.

Quand l'année change:

- les structures affichées changent
- les droits peuvent changer
- les résultats de recherche, organigrammes et exports sont recalculés pour cette année

Capture à insérer:

- fichier: `documentation/captures/02-tableau-de-bord.png`
- montrer: le sélecteur d'année dans l'en-tête ou dans la zone visible la plus claire
- note: inutile de faire une deuxième capture si le sélecteur est déjà visible sur la capture du tableau de bord

## 4. Navigation générale

Le menu de navigation donne accès aux rubriques visibles pour le rôle courant.

Les entrées possibles sont:

- `Rechercher`
- `Organigramme`
- `Import / Export`
- `Responsables`
- `Structures`
- `Demandes de rôles`
- `Délégations`
- `Années`
- `Audit`
- `Signalements`
- `Profil`

Toutes les rubriques ne sont pas visibles pour tous les rôles.

Capture à insérer:

- fichier: `documentation/captures/02-tableau-de-bord.png`
- montrer: le menu latéral ou la navigation principale
- cadrage conseillé: partie gauche ou barre de navigation complète

## 5. Recherche

### 5.1 Recherche multi-onglets

La rubrique `Rechercher` permet de consulter l'annuaire sans modifier les données.

Les onglets disponibles permettent de rechercher:

- les responsables
- les formations
- les structures
- les secrétariats

Les filtres peuvent inclure:

- un texte libre
- des filtres hiérarchiques
- des identifiants ou codes

Capture à insérer:

- fichier: `documentation/captures/03-recherche-responsables.png`
- montrer: l'onglet responsables avec la barre de recherche et les filtres principaux
- cadrage conseillé: partie haute de l'écran avec les filtres

Capture à insérer:

- fichier: `documentation/captures/04-recherche-structures.png`
- montrer: l'onglet structures avec un résultat de recherche affiché
- cadrage conseillé: filtres + tableau ou cartes de résultat

### 5.2 Conseils d'usage

Pour retrouver rapidement une donnée:

- commencer par une recherche texte simple
- affiner ensuite avec les filtres hiérarchiques
- utiliser les identifiants quand ils sont connus

## 6. Fiche structure

La fiche structure permet de consulter les informations détaillées d'une structure.

On y retrouve selon le type de structure:

- l'identification de la structure
- le rattachement hiérarchique
- les coordonnées utiles
- les responsables
- les sous-structures directes
- certaines informations spécifiques au type de structure

Capture à insérer:

- fichier: `documentation/captures/05-fiche-structure.png`
- montrer: une fiche structure complète avec aperçu, rattachement et responsables
- cadrage conseillé: haut de fiche avec les cartes principales

## 7. Organigrammes

### 7.1 Vue structures

La vue `Structures` affiche l'organisation par entités.

Chaque nœud structure peut montrer:

- le nom de la structure
- son niveau dans la hiérarchie
- les responsables liés

Dans le détail rapide des responsables, l'affichage est volontairement simple:

- nom
- prénom
- mail institutionnel

Capture à insérer:

- fichier: `documentation/captures/06-organigramme-structures.png`
- montrer: un organigramme en vue structures avec plusieurs niveaux visibles
- cadrage conseillé: arbre + panneau de contrôle au-dessus

### 7.2 Vue personnes

La vue `Personnes` affiche uniquement des personnes reliées par la hiérarchie N+1.

La fiche d'une personne peut afficher:

- le rôle
- l'affiliation structurelle
- le mail institutionnel
- le mail secondaire

Les filtres disponibles permettent notamment de filtrer par:

- recherche libre
- rôle
- composante
- département
- mention
- parcours
- niveau

Capture à insérer:

- fichier: `documentation/captures/07-organigramme-personnes.png`
- montrer: la vue personnes avec les filtres ouverts et plusieurs nœuds personnes
- cadrage conseillé: contrôles + début de l'arbre

### 7.3 Bibliothèque des organigrammes générés

La bibliothèque des organigrammes générés permet de:

- retrouver un organigramme existant
- filtrer par type de racine
- filtrer par statut figé ou non figé
- limiter le nombre d'éléments visibles
- ouvrir directement un organigramme en vue structures ou personnes

Règle importante:

- certains utilisateurs peuvent consulter des organigrammes déjà générés en dehors de leur périmètre
- cela ne leur donne pas pour autant le droit d'en générer pour ces structures

Capture à insérer:

- fichier: `documentation/captures/08-bibliotheque-organigrammes.png`
- montrer: la bibliothèque avec filtres actifs et boutons `Voir en structures` / `Voir en personnes`
- cadrage conseillé: zone bibliothèque entière

### 7.4 Gel et dégel

Selon le rôle:

- les services centraux peuvent figer et défiger
- les autres utilisateurs consultent l'état sans disposer de cette action

Si un organigramme identique existe déjà et qu'il n'est pas figé, l'application réutilise l'existant au lieu de créer un doublon.

Capture à insérer:

- fichier: `documentation/captures/08-bibliotheque-organigrammes.png`
- montrer: au moins un badge `Figé` ou `Disponible`
- note: pas besoin d'une capture séparée si cette information est déjà visible dans la bibliothèque

## 8. Gestion des responsables

La rubrique `Responsables` permet, selon les droits, de:

- consulter les affectations
- rechercher par nom, login, email ou identifiant
- filtrer par hiérarchie
- créer ou modifier certaines affectations

Capture à insérer:

- fichier: `documentation/captures/12-responsables.png`
- montrer: écran de gestion des responsables avec filtres hiérarchiques et liste de résultats
- cadrage conseillé: partie haute avec filtres + première zone de résultats

## 9. Import / Export

### 9.1 Objectif

La rubrique `Import / Export` permet d'échanger des données avec Excel à partir d'un format standardisé.

Les usages principaux sont:

- exporter une année complète
- exporter une structure précise
- télécharger un modèle standardisé
- prévisualiser un import
- importer tout un fichier ou seulement une structure du fichier

Capture à insérer:

- fichier: `documentation/captures/09-import-export.png`
- montrer: l'écran principal Import / Export avec les zones d'export et d'import
- cadrage conseillé: vue complète de l'écran si possible

### 9.2 Prévisualisation d'import

Avant confirmation, l'application présente une preview d'import pour:

- identifier les créations
- identifier les mises à jour
- signaler les conflits
- contrôler le périmètre d'import

Capture à insérer:

- fichier: `documentation/captures/10-preview-import.png`
- montrer: la zone de prévisualisation avec statuts de lignes ou décisions possibles
- cadrage conseillé: tableau ou liste de preview avec plusieurs cas visibles

### 9.3 Bonnes pratiques

Avant un import:

- vérifier l'année cible
- vérifier le périmètre de structure choisi
- commencer par la preview
- confirmer seulement après lecture des conflits

## 10. Années universitaires

La rubrique `Années` permet, selon le rôle:

- de créer une année
- d'archiver une année
- d'activer une année
- de supprimer une année avec export automatique de sauvegarde
- de cloner toute une année ou seulement certaines structures

Capture à insérer:

- fichier: `documentation/captures/11-gestion-annees.png`
- montrer: la page de gestion des années avec le formulaire de création/clonage et la liste des années existantes
- cadrage conseillé: écran avec les deux zones visibles

## 11. Délégations

La rubrique `Délégations` permet de déléguer certains droits à un autre utilisateur selon les règles du rôle courant.

On peut généralement:

- créer une délégation
- consulter les délégations en cours
- révoquer une délégation

Capture à insérer:

- fichier: `documentation/captures/13-delegations.png`
- montrer: formulaire de création + liste des délégations existantes
- cadrage conseillé: partie haute de page avec les filtres et les premières lignes

## 12. Demandes de rôles

La rubrique `Demandes de rôles` sert à:

- déposer une demande
- consulter le statut d'une demande
- traiter une demande si le rôle le permet

Capture à insérer:

- fichier: `documentation/captures/14-demandes-roles.png`
- montrer: écran de demandes avec formulaire ou liste des demandes selon le profil utilisé
- cadrage conseillé: vue la plus complète possible

## 13. Signalements

La rubrique `Signalements` permet de déclarer un problème ou de suivre son traitement.

Les usages typiques sont:

- créer un signalement
- filtrer les signalements
- suivre leur statut

Capture à insérer:

- fichier: `documentation/captures/15-signalements.png`
- montrer: écran des signalements avec formulaire ou liste filtrée
- cadrage conseillé: zone utile la plus représentative

## 14. Audit

La rubrique `Audit` est réservée aux profils autorisés.

Elle permet de:

- consulter les traces
- filtrer par action, période ou structure
- exporter les journaux si le rôle le permet

Capture à insérer:

- fichier: `documentation/captures/16-audit.png`
- montrer: l'écran d'audit avec les filtres et les premières lignes du journal
- cadrage conseillé: filtres + tableau

## 15. Profil utilisateur

La rubrique `Profil` permet à l'utilisateur de consulter et, selon les champs disponibles, de mettre à jour une partie de ses informations.

Capture à insérer:

- fichier: `documentation/captures/17-profil.png`
- montrer: la page profil avec les informations principales
- cadrage conseillé: la carte profil complète

## 16. Checklist de captures à produire

Pour compléter ce manuel, il faut au minimum les captures suivantes:

1. `01-connexion.png`
2. `02-tableau-de-bord.png`
3. `03-recherche-responsables.png`
4. `04-recherche-structures.png`
5. `05-fiche-structure.png`
6. `06-organigramme-structures.png`
7. `07-organigramme-personnes.png`
8. `08-bibliotheque-organigrammes.png`
9. `09-import-export.png`
10. `10-preview-import.png`
11. `11-gestion-annees.png`
12. `12-responsables.png`
13. `13-delegations.png`
14. `14-demandes-roles.png`
15. `15-signalements.png`
16. `16-audit.png`
17. `17-profil.png`

## 17. Recommandations de prise de capture

Pour que le manuel reste cohérent:

- utiliser la même année universitaire sur toutes les captures si possible
- utiliser un jeu de données lisible et non confidentiel
- éviter les captures trop zoomées
- montrer les filtres quand ils expliquent le fonctionnement
- privilégier les écrans avec un exemple de résultat réel
