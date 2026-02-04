-- Donnees de reference (annees, structures, roles)

insert into annee_universitaire (id_annee, libelle, date_debut, date_fin, statut)
values
  (1, '2023-2024', '2023-09-01', '2024-08-31', 'ARCHIVEE'),
  (2, '2024-2025', '2024-09-01', '2025-08-31', 'ARCHIVEE'),
  (3, '2025-2026', '2025-09-01', '2026-08-31', 'EN_COURS');

update annee_universitaire
set id_annee_source = 1
where id_annee = 2;

update annee_universitaire
set id_annee_source = 2
where id_annee = 3;

insert into entite_structure (
  id_entite,
  id_annee,
  id_entite_parent,
  type_entite,
  nom,
  tel_service,
  bureau_service
) values
  (100, 2, null, 'COMPOSANTE', 'Institut Galilee', '01 49 40 30 00', 'Batiment A'),
  (110, 2, 100, 'DEPARTEMENT', 'Departement Informatique', '01 49 40 30 10', 'A-210'),
  (120, 2, 110, 'MENTION', 'Mention Informatique', '01 49 40 30 20', 'A-215'),
  (130, 2, 120, 'PARCOURS', 'Parcours Ingenierie Logicielle', '01 49 40 30 30', 'A-220'),
  (140, 2, 130, 'NIVEAU', 'Master 1', '01 49 40 30 40', 'A-225');

insert into composante (id_entite, site_web)
values (100, 'https://galilee.univ-paris13.fr');

insert into departement (id_entite, code_interne)
values (110, 'INFO');

insert into mention (id_entite, type_diplome)
values (120, 'Master');

insert into parcours (id_entite, code_parcours)
values (130, 'M1-IL');

insert into niveau (id_entite, libelle_court)
values (140, 'M1');

insert into role (id_role, libelle, description, niveau_hierarchique, is_global)
values
  ('directeur-composante', 'Directeur de composante', 'Pilotage global de la composante', 1, true),
  ('directeur-administratif', 'Directeur administratif', 'Coordination administrative', 2, true),
  ('directeur-administratif-adjoint', 'DA adjoint', 'Appui au directeur administratif', 3, true),
  ('directeur-departement', 'Chef de departement', 'Responsable de departement', 4, true),
  ('directeur-mention', 'Directeur de mention', 'Responsable de mention', 5, true),
  ('directeur-specialite', 'Directeur de specialite', 'Responsable de specialite', 6, true),
  ('responsable-formation', 'Responsable de formation', 'Responsable pedagogique', 7, true),
  ('responsable-annee', 'Responsable annee', 'Responsable annee de formation', 8, true),
  ('utilisateur-simple', 'Enseignant', 'Utilisateur standard', 9, true),
  ('administrateur', 'Administrateur', 'Administration applicative', 0, true),
  ('services-centraux', 'Services centraux', 'Support et pilotage transversal', 0, true)
on conflict (id_role) do nothing;
