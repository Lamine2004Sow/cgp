const { query } = require("./db");

const PERMISSIONS = {
  VIEW: "view",
  EDIT_SELF: "edit_self",
  MANAGE_RESPONSABLES: "manage_responsables",
  ASSIGN_ROLE: "assign_role",
  MANAGE_ROLES: "manage_roles",
  DELEGATE: "delegate",
  MANAGE_YEARS: "manage_years",
  GENERATE_ORG: "generate_org",
  FREEZE_ORG: "freeze_org",
  IMPORT_DATA: "import_data",
  EXPORT_DATA: "export_data",
  AUDIT_VIEW: "audit_view",
  DELETE_USER: "delete_user",
};

const ROLE_PERMISSIONS = {
  administrateur: [
    PERMISSIONS.VIEW,
    PERMISSIONS.EDIT_SELF,
    PERMISSIONS.MANAGE_RESPONSABLES,
    PERMISSIONS.ASSIGN_ROLE,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.DELEGATE,
    PERMISSIONS.MANAGE_YEARS,
    PERMISSIONS.GENERATE_ORG,
    PERMISSIONS.FREEZE_ORG,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.DELETE_USER,
  ],
  "services-centraux": [
    PERMISSIONS.VIEW,
    PERMISSIONS.EDIT_SELF,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_YEARS,
    PERMISSIONS.FREEZE_ORG,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.AUDIT_VIEW,
  ],
  "directeur-composante": [
    PERMISSIONS.VIEW,
    PERMISSIONS.EDIT_SELF,
    PERMISSIONS.MANAGE_RESPONSABLES,
    PERMISSIONS.ASSIGN_ROLE,
    PERMISSIONS.DELEGATE,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.GENERATE_ORG,
    PERMISSIONS.DELETE_USER,
  ],
  "directeur-administratif": [
    PERMISSIONS.VIEW,
    PERMISSIONS.EDIT_SELF,
    PERMISSIONS.MANAGE_RESPONSABLES,
    PERMISSIONS.IMPORT_DATA,
  ],
  "directeur-administratif-adjoint": [
    PERMISSIONS.VIEW,
    PERMISSIONS.EDIT_SELF,
    PERMISSIONS.MANAGE_RESPONSABLES,
    PERMISSIONS.IMPORT_DATA,
  ],
  "directeur-departement": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF],
  "directeur-departement": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF, PERMISSIONS.GENERATE_ORG],
  "directeur-mention": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF, PERMISSIONS.GENERATE_ORG],
  "directeur-specialite": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF, PERMISSIONS.GENERATE_ORG],
  "responsable-formation": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF, PERMISSIONS.GENERATE_ORG],
  "responsable-annee": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF, PERMISSIONS.GENERATE_ORG],
  "utilisateur-simple": [PERMISSIONS.VIEW, PERMISSIONS.EDIT_SELF],
};

const NORMALIZED_PERMISSIONS = Object.values(PERMISSIONS);

const normalizeDelegationPermission = (value) => {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();

  if (NORMALIZED_PERMISSIONS.includes(normalized)) {
    return normalized;
  }

  const mapping = {
    ecriture: PERMISSIONS.MANAGE_RESPONSABLES,
    lecture: PERMISSIONS.VIEW,
    droit_ecriture: PERMISSIONS.MANAGE_RESPONSABLES,
    droit_lecture: PERMISSIONS.VIEW,
    delegation: PERMISSIONS.DELEGATE,
    roles: PERMISSIONS.ASSIGN_ROLE,
    import: PERMISSIONS.IMPORT_DATA,
    export: PERMISSIONS.EXPORT_DATA,
    audit: PERMISSIONS.AUDIT_VIEW,
    organigramme: PERMISSIONS.GENERATE_ORG,
  };

  return mapping[normalized] || null;
};

const getRolePermissions = (roleId) => {
  if (!roleId) return [PERMISSIONS.VIEW];
  return ROLE_PERMISSIONS[roleId] || [PERMISSIONS.VIEW];
};

const getCurrentYearId = async () => {
  const result = await query(
    "select id_annee from annee_universitaire where statut = 'EN_COURS' order by date_debut desc limit 1",
  );
  return result.rows[0]?.id_annee || null;
};

const isEntiteDescendant = async (scopeEntiteId, targetEntiteId) => {
  const result = await query(
    `with recursive descendants as (
      select id_entite, id_entite_parent
      from entite_structure
      where id_entite = $1
      union all
      select e.id_entite, e.id_entite_parent
      from entite_structure e
      inner join descendants d on e.id_entite_parent = d.id_entite
    )
    select 1 as allowed from descendants where id_entite = $2 limit 1`,
    [scopeEntiteId, targetEntiteId],
  );
  return result.rowCount > 0;
};

const getUserAffectations = async (userId, yearId) => {
  const params = [userId];
  let sql = `select a.*, r.id_role, r.niveau_hierarchique
             from affectation a
             join role r on r.id_role = a.id_role
             where a.id_user = $1`;

  if (yearId) {
    params.push(yearId);
    sql += " and a.id_annee = $2";
  }

  return query(sql, params).then((res) => res.rows);
};

const getUserDelegations = async (userId) => {
  return query(
    `select d.*, e.id_annee as id_annee_entite
     from delegation d
     join entite_structure e on e.id_entite = d.id_entite
     where d.delegataire_id = $1
       and d.statut = 'ACTIVE'
       and d.date_debut <= current_date
       and (d.date_fin is null or d.date_fin >= current_date)`,
    [userId],
  ).then((res) => res.rows);
};

const getPermissionsForDelegation = (delegation) => {
  if (delegation.id_role) {
    return getRolePermissions(delegation.id_role);
  }
  const perm = normalizeDelegationPermission(delegation.type_droit);
  return perm ? [perm] : [];
};

const getEffectivePermissions = async ({ userId, entiteId, yearId }) => {
  const permissions = new Set();

  const [affectations, delegations] = await Promise.all([
    getUserAffectations(userId, yearId),
    getUserDelegations(userId),
  ]);

  for (const affectation of affectations) {
    const inScope = entiteId
      ? await isEntiteDescendant(affectation.id_entite, entiteId)
      : true;

    if (inScope) {
      getRolePermissions(affectation.id_role).forEach((perm) => permissions.add(perm));
    }
  }

  for (const delegation of delegations) {
    if (yearId && delegation.id_annee_entite && delegation.id_annee_entite !== yearId) {
      continue;
    }

    const inScope = entiteId
      ? await isEntiteDescendant(delegation.id_entite, entiteId)
      : true;

    if (!inScope) continue;

    getPermissionsForDelegation(delegation).forEach((perm) => permissions.add(perm));
  }

  return permissions;
};

const hasPermission = async ({ userId, permission, entiteId, yearId }) => {
  const perms = await getEffectivePermissions({ userId, entiteId, yearId });
  return perms.has(permission);
};

const hasAnyPermission = async ({ userId, permission, yearId }) => {
  const perms = await getEffectivePermissions({ userId, entiteId: null, yearId });
  return perms.has(permission);
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  getCurrentYearId,
  isEntiteDescendant,
  getUserAffectations,
  getUserDelegations,
  getPermissionsForDelegation,
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  normalizeDelegationPermission,
};
