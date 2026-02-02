-- Recalage des séquences après inserts explicites

select setval(pg_get_serial_sequence('annee_universitaire', 'id_annee'), (select max(id_annee) from annee_universitaire));
select setval(pg_get_serial_sequence('entite_structure', 'id_entite'), (select max(id_entite) from entite_structure));
select setval(pg_get_serial_sequence('utilisateur', 'id_user'), (select max(id_user) from utilisateur));
select setval(pg_get_serial_sequence('affectation', 'id_affectation'), (select max(id_affectation) from affectation));
select setval(pg_get_serial_sequence('contact_role', 'id_contact_role'), (select max(id_contact_role) from contact_role));
select setval(pg_get_serial_sequence('demande_role', 'id_demande_role'), (select max(id_demande_role) from demande_role));
select setval(pg_get_serial_sequence('delegation', 'id_delegation'), (select max(id_delegation) from delegation));
select setval(pg_get_serial_sequence('journal_audit', 'id_log'), (select max(id_log) from journal_audit));
select setval(pg_get_serial_sequence('demande_modification', 'id_demande'), (select max(id_demande) from demande_modification));
select setval(pg_get_serial_sequence('signalement', 'id_signalement'), (select max(id_signalement) from signalement));
select setval(pg_get_serial_sequence('notification', 'id_notif'), (select max(id_notif) from notification));
select setval(pg_get_serial_sequence('organigramme', 'id_organigramme'), (select max(id_organigramme) from organigramme));
