-- Mise a jour signalement: statut EN_COURS + commentaires

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'signalement_statut' and e.enumlabel = 'EN_COURS'
  ) then
    alter type signalement_statut add value 'EN_COURS';
  end if;
end $$;

alter table signalement
  add column if not exists cloture_par_id bigint references utilisateur(id_user) on delete set null,
  add column if not exists date_prise_en_charge timestamptz,
  add column if not exists commentaire_prise_en_charge text,
  add column if not exists commentaire_cloture text;
