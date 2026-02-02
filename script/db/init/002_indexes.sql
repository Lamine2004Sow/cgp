-- Indexes pour accélérer les jointures et recherches courantes

create index if not exists idx_entite_annee on entite_structure(id_annee);
create index if not exists idx_entite_parent on entite_structure(id_entite_parent);
create index if not exists idx_role_composante on role(id_composante);

create index if not exists idx_affectation_user on affectation(id_user);
create index if not exists idx_affectation_role on affectation(id_role);
create index if not exists idx_affectation_entite on affectation(id_entite);
create index if not exists idx_affectation_annee on affectation(id_annee);

create index if not exists idx_contact_role_affectation on contact_role(id_affectation);
create index if not exists idx_demande_role_createur on demande_role(id_user_createur);
create index if not exists idx_demande_role_validateur on demande_role(id_user_validateur);

create index if not exists idx_delegation_delegant on delegation(delegant_id);
create index if not exists idx_delegation_delegataire on delegation(delegataire_id);
create index if not exists idx_delegation_entite on delegation(id_entite);

create index if not exists idx_audit_auteur on journal_audit(id_user_auteur);
create index if not exists idx_demande_modif_auteur on demande_modification(auteur_id);
create index if not exists idx_demande_modif_validateur on demande_modification(validateur_id);

create index if not exists idx_signalement_auteur on signalement(auteur_id);
create index if not exists idx_signalement_traitant on signalement(traitant_id);
create index if not exists idx_signalement_entite on signalement(id_entite_cible);

create index if not exists idx_notification_destinataire on notification(destinataire_id);
create index if not exists idx_notification_demande on notification(id_demande);
create index if not exists idx_notification_signalement on notification(id_signalement);
create index if not exists idx_notification_demande_role on notification(id_demande_role);

create index if not exists idx_organigramme_annee on organigramme(id_annee);
create index if not exists idx_organigramme_entite on organigramme(id_entite_racine);
create index if not exists idx_organigramme_generated_by on organigramme(generated_by);
