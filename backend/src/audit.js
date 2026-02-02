const { query } = require("./db");

const logAudit = async ({
  actorId,
  action,
  targetType,
  targetId,
  beforeValue,
  afterValue,
}) => {
  await query(
    `insert into journal_audit
      (id_user_auteur, horodatage, type_action, cible_type, cible_id, ancienne_valeur, nouvelle_valeur)
     values ($1, now(), $2, $3, $4, $5, $6)`,
    [
      actorId,
      action,
      targetType,
      targetId ? String(targetId) : null,
      beforeValue ? JSON.stringify(beforeValue) : null,
      afterValue ? JSON.stringify(afterValue) : null,
    ],
  );
};

module.exports = { logAudit };
