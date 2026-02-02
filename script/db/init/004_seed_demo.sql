-- Donnees de demonstration (utilisateurs, affectations, workflows)

insert into utilisateur (
  id_user,
  login,
  uid_cas,
  nom,
  prenom,
  email_institutionnel,
  telephone,
  bureau,
  statut
) values
  (1, 'marie.dubois', 'm.dubois', 'Dubois', 'Marie', 'marie.dubois@univ-paris13.fr', '01 49 40 31 00', 'B-210', 'ACTIF'),
  (2, 'pierre.martin', 'p.martin', 'Martin', 'Pierre', 'pierre.martin@univ-paris13.fr', '01 49 40 31 01', 'B-211', 'ACTIF'),
  (3, 'sophie.bernard', 's.bernard', 'Bernard', 'Sophie', 'sophie.bernard@univ-paris13.fr', '01 49 40 31 02', 'A-310', 'ACTIF'),
  (4, 'laurent.petit', 'l.petit', 'Petit', 'Laurent', 'laurent.petit@univ-paris13.fr', '01 49 40 31 03', 'A-320', 'ACTIF'),
  (5, 'olivier.lefebvre', 'o.lefebvre', 'Lefebvre', 'Olivier', 'olivier.lefebvre@univ-paris13.fr', '01 49 40 31 04', 'A-120', 'ACTIF'),
  (6, 'thomas.durand', 't.durand', 'Durand', 'Thomas', 'thomas.durand@univ-paris13.fr', '01 49 40 31 05', 'DSI-02', 'ACTIF'),
  (7, 'nathalie.bernard', 'n.bernard', 'Bernard', 'Nathalie', 'nathalie.bernard@univ-paris13.fr', '01 49 40 31 06', 'B-215', 'ACTIF'),
  (8, 'marc.rousseau', 'm.rousseau', 'Rousseau', 'Marc', 'marc.rousseau@univ-paris13.fr', '01 49 40 31 07', 'A-315', 'ACTIF'),
  (9, 'claire.chaussard', 'c.chaussard', 'Chaussard', 'Claire', 'claire.chaussard@univ-paris13.fr', '01 49 40 31 08', 'A-325', 'ACTIF'),
  (10, 'julie.moreau', 'j.moreau', 'Moreau', 'Julie', 'julie.moreau@univ-paris13.fr', '01 49 40 31 09', 'A-330', 'ACTIF'),
  (11, 'carine.leroy', 'c.leroy', 'Leroy', 'Carine', 'carine.leroy@univ-paris13.fr', '01 49 40 31 10', 'SC-01', 'ACTIF');

insert into affectation (
  id_affectation,
  id_user,
  id_role,
  id_entite,
  id_annee,
  date_debut,
  date_fin
) values
  (1, 1, 'directeur-composante', 100, 2, '2024-09-01', null),
  (2, 2, 'directeur-administratif', 100, 2, '2024-09-01', null),
  (3, 7, 'directeur-administratif-adjoint', 100, 2, '2024-09-01', null),
  (4, 3, 'directeur-departement', 110, 2, '2024-09-01', null),
  (5, 8, 'directeur-mention', 120, 2, '2024-09-01', null),
  (6, 9, 'directeur-specialite', 130, 2, '2024-09-01', null),
  (7, 4, 'responsable-formation', 130, 2, '2024-09-01', null),
  (8, 10, 'responsable-annee', 140, 2, '2024-09-01', null),
  (9, 5, 'utilisateur-simple', 110, 2, '2024-09-01', null),
  (10, 6, 'administrateur', 100, 2, '2024-09-01', null),
  (11, 11, 'services-centraux', 100, 2, '2024-09-01', null);

insert into contact_role (id_contact_role, id_affectation, email_fonctionnelle, type_email)
values (1, 4, 'dep-info@univ-paris13.fr', 'service');

insert into delegation (
  id_delegation,
  delegant_id,
  delegataire_id,
  id_entite,
  id_role,
  type_droit,
  date_debut,
  date_fin,
  statut
) values
  (1, 1, 4, 130, 'responsable-formation', 'validation', '2024-10-01', null, 'ACTIVE');

insert into demande_role (
  id_demande_role,
  id_user_createur,
  role_propose,
  description,
  justificatif,
  statut,
  date_creation
) values
  (1, 5, 'responsable-formation', 'Demande de responsabilite sur le parcours IL', 'Appui du chef de departement', 'EN_ATTENTE', now());

insert into demande_modification (
  id_demande,
  auteur_id,
  cible_type,
  cible_id,
  champ,
  valeur_proposee,
  statut,
  date_creation
) values
  (1, 5, 'UTILISATEUR', '5', 'telephone', '01 49 40 31 99', 'EN_ATTENTE', now());

insert into signalement (
  id_signalement,
  auteur_id,
  id_entite_cible,
  description,
  statut,
  date_creation
) values
  (1, 5, 110, 'Erreur sur le libelle du departement.', 'OUVERT', now());

insert into notification (
  id_notif,
  destinataire_id,
  message,
  date_envoi,
  lu,
  id_demande,
  id_signalement,
  id_demande_role
) values
  (1, 1, 'Nouvelle demande de role en attente.', now(), false, null, null, 1),
  (2, 2, 'Signalement a traiter.', now(), false, null, 1, null),
  (3, 5, 'Votre demande de modification est enregistree.', now(), false, 1, null, null);

insert into organigramme (
  id_organigramme,
  id_annee,
  id_entite_racine,
  generated_by,
  generated_at,
  est_fige,
  export_path,
  export_format,
  visibility_scope
) values
  (1, 2, 100, 1, now(), false, '/exports/organigramme-2024-2025.pdf', 'PDF', 'public');

insert into journal_audit (
  id_log,
  id_user_auteur,
  horodatage,
  type_action,
  cible_type,
  cible_id,
  ancienne_valeur,
  nouvelle_valeur
) values
  (1, 6, now(), 'CREATION', 'ORGANIGRAMME', '1', null, 'Organigramme genere');
