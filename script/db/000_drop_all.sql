-- Drop all tables and types for annuaire database

drop table if exists organigramme cascade;
drop table if exists notification cascade;
drop table if exists signalement cascade;
drop table if exists demande_modification cascade;
drop table if exists journal_audit cascade;
drop table if exists delegation cascade;
drop table if exists contact_role cascade;
drop table if exists affectation cascade;
drop table if exists demande_role cascade;
drop table if exists role cascade;
drop table if exists utilisateur cascade;
drop table if exists niveau cascade;
drop table if exists parcours cascade;
drop table if exists mention cascade;
drop table if exists departement cascade;
drop table if exists composante cascade;
drop table if exists entite_structure cascade;
drop table if exists annee_universitaire cascade;

drop type if exists signalement_statut;
drop type if exists delegation_statut;
drop type if exists demande_statut;
drop type if exists utilisateur_statut;
drop type if exists entite_type;
drop type if exists annee_statut;
