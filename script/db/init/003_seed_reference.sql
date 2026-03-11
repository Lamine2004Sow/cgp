-- Données de référence (années, structures, rôles, types diplômes)

insert into annee_universitaire (id_annee, libelle, date_debut, date_fin, statut)
values
  (1, '2023-2024', '2023-09-01', '2024-08-31', 'ARCHIVEE'),
  (2, '2024-2025', '2024-09-01', '2025-08-31', 'ARCHIVEE'),
  (3, '2025-2026', '2025-09-01', '2026-08-31', 'EN_COURS');

update annee_universitaire set id_annee_source = 1 where id_annee = 2;
update annee_universitaire set id_annee_source = 2 where id_annee = 3;

-- ─── Types de diplômes (39 types identifiés — Sprint 4 §9) ───────────────────
insert into type_diplome (libelle) values
  ('Licence'),
  ('Licence professionnelle'),
  ('BUT'),
  ('Master'),
  ('Master professionnel'),
  ('Master recherche'),
  ('Ingénieur'),
  ('Doctorat'),
  ('DUT'),
  ('Diplôme d''État'),
  ('Diplôme d''études spécialisées'),
  ('Diplôme d''études spécialisées complémentaires'),
  ('Capacité'),
  ('Certificat de capacité'),
  ('DEUST'),
  ('DAEU'),
  ('Diplôme d''université'),
  ('DU'),
  ('DIU'),
  ('MBA'),
  ('MS'),
  ('MSc'),
  ('Magistère'),
  ('Titre d''ingénieur'),
  ('DNSEP'),
  ('DNAT'),
  ('BTS'),
  ('BTSA'),
  ('Classe préparatoire'),
  ('CPGE'),
  ('Certificat de spécialisation'),
  ('CQP'),
  ('Titre RNCP'),
  ('Certificat de compétences'),
  ('HDR'),
  ('Diplôme d''accès aux études universitaires'),
  ('Bachelor universitaire de technologie'),
  ('Diplôme national de master'),
  ('Diplôme de comptabilité et de gestion')
on conflict (libelle) do nothing;

-- ─── Structure de démonstration ───────────────────────────────────────────────
insert into entite_structure (
  id_entite, id_annee, id_entite_parent, type_entite, nom, tel_service, bureau_service
) values
  (100, 2, null, 'COMPOSANTE',  'Institut Galilee',             '01 49 40 30 00', 'Batiment A'),
  (110, 2, 100,  'DEPARTEMENT', 'Departement Informatique',     '01 49 40 30 10', 'A-210'),
  (120, 2, 110,  'MENTION',     'Mention Informatique',         '01 49 40 30 20', 'A-215'),
  (130, 2, 120,  'PARCOURS',    'Parcours Ingenierie Logicielle','01 49 40 30 30', 'A-220'),
  (140, 2, 130,  'NIVEAU',      'Master 1',                     '01 49 40 30 40', 'A-225');

insert into composante (id_entite, code_composante, type_composante, site_web, mail_fonctionnel, mail_institutionnel, campus)
values (100, '903', 'INSTITUT', 'https://galilee.univ-paris13.fr', 'directeur.galilee@univ-paris13.fr', 'ig@univ-paris13.fr', 'Villetaneuse');

insert into departement (id_entite, code_interne)
values (110, 'INFO');

insert into mention (id_entite, type_diplome, cycle, id_type_diplome)
values (120, 'Master', 2, (select id_type_diplome from type_diplome where libelle = 'Master'));

insert into parcours (id_entite, code_parcours)
values (130, 'M1-IL');

insert into niveau (id_entite, libelle_court)
values (140, 'M1');

-- ─── Rôles de référence ───────────────────────────────────────────────────────
insert into role (id_role, libelle, description, niveau_hierarchique, is_global, est_administratif, est_transverse)
values
  ('directeur-composante',          'Directeur de composante',       'Pilotage global de la composante',        1,  true,  false, false),
  ('directeur-administratif',       'Directeur administratif',       'Coordination administrative',             2,  true,  true,  false),
  ('directeur-administratif-adjoint','DA adjoint',                   'Appui au directeur administratif',        3,  true,  true,  false),
  ('directeur-departement',         'Chef de departement',           'Responsable de departement',              4,  true,  false, false),
  ('directeur-adjoint-licence',     'Directeur adjoint licence',     'Responsable global du cycle licence',     5,  true,  false, false),
  ('responsable-service-pedagogique','Responsable service pédagogique','Pilotage du service pédagogique',       5,  true,  true,  false),
  ('directeur-mention',             'Directeur de mention',          'Responsable de mention',                  6,  true,  false, false),
  ('directeur-specialite',          'Directeur de specialite',       'Responsable de specialite',               7,  true,  false, false),
  ('responsable-formation',         'Responsable de formation',      'Responsable pedagogique',                 8,  true,  false, false),
  ('responsable-annee',             'Responsable annee',             'Responsable annee de formation',          9,  true,  false, false),
  ('directeur-etudes',              'Directeur des études',          'Responsable pédagogique des études',      9,  true,  false, false),
  ('responsable-qualite',           'Responsable qualité',           'Référent qualité transverse',             10, true,  false, true),
  ('responsable-international',     'Responsable international',     'Référent international transverse',       10, true,  false, true),
  ('referent-commun',               'Référent commun',               'Référent transverse divers',              10, true,  false, true),
  ('directeur-adjoint-ecole',       'Directeur adjoint d''école',    'Adjoint direction école transverse',      10, true,  false, true),
  ('secretariat-pedagogique',       'Secrétariat pédagogique',       'Personnel administratif pédagogique',     11, true,  true,  false),
  ('utilisateur-simple',            'Enseignant',                    'Utilisateur standard',                    20, true,  false, false),
  ('administrateur',                'Administrateur',                'Administration applicative',               0,  true,  false, false),
  ('services-centraux',             'Services centraux',             'Support et pilotage transversal',          0,  true,  false, false),
  ('lecture-seule',                 'Lecture seule',                 'Accès en lecture seule',                  99, true,  false, false)
on conflict (id_role) do nothing;
