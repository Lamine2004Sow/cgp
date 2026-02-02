const express = require("express");
const { z } = require("zod");
const { query, withTransaction } = require("./db");
const { logAudit } = require("./audit");
const config = require("./config");
const {
  PERMISSIONS,
  getRolePermissions,
  getCurrentYearId,
  hasPermission,
  hasAnyPermission,
  isEntiteDescendant,
  getUserAffectations,
  getUserDelegations,
  getPermissionsForDelegation,
  normalizeDelegationPermission,
} = require("./permissions");

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ensurePermission = async ({ userId, permission, entiteId, yearId }) => {
  const resolvedYearId = yearId ?? (await getCurrentYearId());
  const allowed = entiteId
    ? await hasPermission({ userId, permission, entiteId, yearId: resolvedYearId })
    : await hasAnyPermission({ userId, permission, yearId: resolvedYearId });
  if (!allowed) {
    const error = new Error("Permission insuffisante");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

const isServicesCentraux = async (userId, yearId) => {
  const affectations = await getUserAffectations(userId, yearId);
  return affectations.some((aff) => aff.id_role === "services-centraux");
};

const isServicesCentrauxOrAdmin = async (userId) => {
  const result = await query(
    "select 1 from affectation where id_user = $1 and id_role in ('services-centraux', 'administrateur') limit 1",
    [userId],
  );
  return result.rowCount > 0;
};

const ensureEmailAllowed = async (email, userId, yearId) => {
  if (!email) return;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    const error = new Error("Email fonctionnel invalide");
    error.statusCode = 400;
    error.code = "INVALID_EMAIL";
    throw error;
  }
  if (config.allowedEmailDomains.includes(domain)) return;
  const allowedOverride = await isServicesCentraux(userId, yearId);
  if (!allowedOverride) {
    const error = new Error("Email fonctionnel hors domaine autorisé");
    error.statusCode = 403;
    error.code = "EMAIL_DOMAIN_FORBIDDEN";
    throw error;
  }
};

const ensureAnyPermission = async ({ userId, permissions, entiteId, yearId }) => {
  const resolvedYearId = yearId ?? (await getCurrentYearId());
  for (const permission of permissions) {
    const allowed = entiteId
      ? await hasPermission({ userId, permission, entiteId, yearId: resolvedYearId })
      : await hasAnyPermission({ userId, permission, yearId: resolvedYearId });
    if (allowed) return;
  }
  const error = new Error("Permission insuffisante");
  error.statusCode = 403;
  error.code = "FORBIDDEN";
  throw error;
};

const parseYearId = async (value) => {
  if (value) return Number.parseInt(value, 10);
  return getCurrentYearId();
};

const canGrantRole = async ({ actorId, roleId, entiteId, yearId }) => {
  const requiredPermissions = getRolePermissions(roleId);
  for (const perm of requiredPermissions) {
    const allowed = await hasPermission({
      userId: actorId,
      permission: perm,
      entiteId,
      yearId,
    });
    if (!allowed) return false;
  }
  return true;
};

const cleanupDelegationsForDelegator = async (client, delegantId, yearId, visited = new Set()) => {
  if (visited.has(delegantId)) return;
  visited.add(delegantId);

  const { rows: delegations } = await client.query(
    `select * from delegation
     where delegant_id = $1
       and statut = 'ACTIVE'
       and date_debut <= current_date
       and (date_fin is null or date_fin >= current_date)`,
    [delegantId],
  );

  for (const delegation of delegations) {
    const permissions = getPermissionsForDelegation(delegation);
    const entiteId = delegation.id_entite;
    let stillAllowed = true;

    for (const perm of permissions) {
      const allowed = await hasPermission({
        userId: delegantId,
        permission: perm,
        entiteId,
        yearId,
      });
      if (!allowed) {
        stillAllowed = false;
        break;
      }
    }

    if (!stillAllowed) {
      await client.query(
        "update delegation set statut = 'ANNULEE', date_fin = current_date where id_delegation = $1",
        [delegation.id_delegation],
      );
      await logAudit({
        actorId: delegantId,
        action: "DELEGATION_REVOKED",
        targetType: "DELEGATION",
        targetId: delegation.id_delegation,
        beforeValue: delegation,
        afterValue: { statut: "ANNULEE" },
      });

      await cleanupDelegationsForDelegator(client, delegation.delegataire_id, yearId, visited);
    }
  }
};

const buildOrganigrammeTree = async (yearId, rootEntiteId) => {
  const { rows: entites } = await query(
    `select * from entite_structure
     where id_annee = $1
     order by id_entite`,
    [yearId],
  );

  const entiteMap = new Map();
  entites.forEach((entite) => {
    entiteMap.set(entite.id_entite, { ...entite, children: [] });
  });

  for (const entite of entites) {
    if (entite.id_entite_parent && entiteMap.has(entite.id_entite_parent)) {
      entiteMap.get(entite.id_entite_parent).children.push(entiteMap.get(entite.id_entite));
    }
  }

  const root = entiteMap.get(rootEntiteId);
  if (!root) return null;

  const { rows: responsables } = await query(
    `select a.id_entite, u.nom, u.prenom, u.email_institutionnel, a.id_role
     from affectation a
     join utilisateur u on u.id_user = a.id_user
     where a.id_annee = $1`,
    [yearId],
  );

  const responsablesByEntite = new Map();
  for (const resp of responsables) {
    if (!responsablesByEntite.has(resp.id_entite)) {
      responsablesByEntite.set(resp.id_entite, []);
    }
    responsablesByEntite.get(resp.id_entite).push(resp);
  }

  const attachResponsables = (node) => {
    node.responsables = responsablesByEntite.get(node.id_entite) || [];
    node.children.forEach(attachResponsables);
  };
  attachResponsables(root);

  return root;
};

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const yearId = await parseYearId(req.query.yearId);
    const affectations = await getUserAffectations(req.user.id_user, yearId);
    res.json({ user: req.user, affectations });
  }),
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const yearId = req.query.yearId ? Number.parseInt(req.query.yearId, 10) : null;
    const params = [];
    const conditions = [];

    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      conditions.push(`(u.nom ilike $${params.length} or u.prenom ilike $${params.length} or u.login ilike $${params.length} or u.email_institutionnel ilike $${params.length})`);
    }

    if (req.query.role) {
      params.push(req.query.role);
      conditions.push(`r.id_role = $${params.length}`);
    }

    if (req.query.entite) {
      params.push(Number.parseInt(req.query.entite, 10));
      conditions.push(`a.id_entite = $${params.length}`);
    }

    if (yearId) {
      params.push(yearId);
      conditions.push(`a.id_annee = $${params.length}`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query(
      `select u.id_user, u.login, u.nom, u.prenom, u.email_institutionnel, u.telephone, u.bureau,
              json_agg(distinct jsonb_build_object(
                'role', r.id_role,
                'entite', e.nom,
                'id_entite', e.id_entite,
                'id_annee', a.id_annee
              )) filter (where r.id_role is not null) as roles
       from utilisateur u
       left join affectation a on a.id_user = u.id_user
       left join role r on r.id_role = a.id_role
       left join entite_structure e on e.id_entite = a.id_entite
       ${whereClause}
       group by u.id_user
       order by u.nom, u.prenom`,
      params,
    );

    res.json({ items: result.rows });
  }),
);

router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    const { rows } = await query("select * from utilisateur where id_user = $1", [userId]);
    if (!rows[0]) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const affectations = await getUserAffectations(userId, null);
    res.json({ user: rows[0], affectations });
  }),
);

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      login: z.string().min(1),
      nom: z.string().min(1),
      prenom: z.string().min(1),
      email_institutionnel: z.string().email().optional().nullable(),
      telephone: z.string().optional().nullable(),
      bureau: z.string().optional().nullable(),
      statut: z.enum(["ACTIF", "INACTIF"]).optional(),
      affectations: z
        .array(
          z.object({
            id_role: z.string(),
            id_entite: z.number(),
            id_annee: z.number(),
            date_debut: z.string(),
            date_fin: z.string().nullable().optional(),
          }),
        )
        .optional(),
    });

    const payload = schema.parse(req.body);
    const actorId = req.user.id_user;

    if (payload.affectations?.length) {
      for (const aff of payload.affectations) {
        await ensurePermission({
          userId: actorId,
          permission: PERMISSIONS.ASSIGN_ROLE,
          entiteId: aff.id_entite,
          yearId: aff.id_annee,
        });
        const canGrant = await canGrantRole({
          actorId,
          roleId: aff.id_role,
          entiteId: aff.id_entite,
          yearId: aff.id_annee,
        });
        if (!canGrant) {
          return res.status(403).json({ error: "ROLE_GRANT_FORBIDDEN" });
        }
      }
    } else {
      await ensurePermission({
        userId: actorId,
        permission: PERMISSIONS.MANAGE_RESPONSABLES,
        entiteId: null,
        yearId: null,
      });
    }

    const created = await withTransaction(async (client) => {
      const insertUser = await client.query(
        `insert into utilisateur (login, nom, prenom, email_institutionnel, telephone, bureau, statut)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          payload.login,
          payload.nom,
          payload.prenom,
          payload.email_institutionnel || null,
          payload.telephone || null,
          payload.bureau || null,
          payload.statut || "ACTIF",
        ],
      );
      const user = insertUser.rows[0];

      if (payload.affectations?.length) {
        for (const aff of payload.affectations) {
          await client.query(
            `insert into affectation (id_user, id_role, id_entite, id_annee, date_debut, date_fin)
             values ($1, $2, $3, $4, $5, $6)`,
            [
              user.id_user,
              aff.id_role,
              aff.id_entite,
              aff.id_annee,
              aff.date_debut,
              aff.date_fin || null,
            ],
          );
        }
      }

      await logAudit({
        actorId,
        action: "USER_CREATED",
        targetType: "UTILISATEUR",
        targetId: user.id_user,
        beforeValue: null,
        afterValue: user,
      });

      return user;
    });

    res.status(201).json({ user: created });
  }),
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    const { rows } = await query("select * from utilisateur where id_user = $1", [userId]);
    const existing = rows[0];
    if (!existing) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const schema = z.object({
      nom: z.string().optional(),
      prenom: z.string().optional(),
      email_institutionnel: z.string().email().optional().nullable(),
      telephone: z.string().optional().nullable(),
      bureau: z.string().optional().nullable(),
    });

    const payload = schema.parse(req.body);
    const actorId = req.user.id_user;

    const isSelf = actorId === userId;
    if (!isSelf) {
      const affectations = await getUserAffectations(userId, null);
      const entiteId = affectations[0]?.id_entite || null;
      await ensurePermission({
        userId: actorId,
        permission: PERMISSIONS.MANAGE_RESPONSABLES,
        entiteId,
        yearId: affectations[0]?.id_annee || null,
      });
    } else {
      const allowedFields = ["telephone", "bureau", "email_institutionnel"];
      for (const key of Object.keys(payload)) {
        if (!allowedFields.includes(key)) {
          return res.status(403).json({ error: "SELF_EDIT_FORBIDDEN" });
        }
      }
    }

    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `update utilisateur
         set nom = coalesce($1, nom),
             prenom = coalesce($2, prenom),
             email_institutionnel = coalesce($3, email_institutionnel),
             telephone = coalesce($4, telephone),
             bureau = coalesce($5, bureau)
         where id_user = $6
         returning *`,
        [
          payload.nom || null,
          payload.prenom || null,
          payload.email_institutionnel || null,
          payload.telephone || null,
          payload.bureau || null,
          userId,
        ],
      );

      await logAudit({
        actorId,
        action: "USER_UPDATED",
        targetType: "UTILISATEUR",
        targetId: userId,
        beforeValue: existing,
        afterValue: result.rows[0],
      });

      return result.rows[0];
    });

    res.json({ user: updated });
  }),
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    const { rows } = await query("select * from utilisateur where id_user = $1", [userId]);
    const existing = rows[0];
    if (!existing) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.DELETE_USER,
      entiteId: null,
      yearId: null,
    });

    await withTransaction(async (client) => {
      await client.query("delete from affectation where id_user = $1", [userId]);
      await client.query("delete from delegation where delegant_id = $1 or delegataire_id = $1", [userId]);
      await client.query("delete from utilisateur where id_user = $1", [userId]);

      await logAudit({
        actorId: req.user.id_user,
        action: "USER_DELETED",
        targetType: "UTILISATEUR",
        targetId: userId,
        beforeValue: existing,
        afterValue: null,
      });
    });

    res.status(204).send();
  }),
);

router.get(
  "/roles",
  asyncHandler(async (_req, res) => {
    const result = await query("select * from role order by niveau_hierarchique asc");
    res.json({ items: result.rows });
  }),
);

router.post(
  "/roles",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_ROLES,
      entiteId: null,
      yearId: null,
    });

    const schema = z.object({
      id_role: z.string(),
      libelle: z.string(),
      description: z.string().optional().nullable(),
      niveau_hierarchique: z.number().int().optional(),
      is_global: z.boolean().optional(),
      id_composante: z.number().optional().nullable(),
    });

    const payload = schema.parse(req.body);

    const result = await query(
      `insert into role (id_role, libelle, description, niveau_hierarchique, is_global, id_composante)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        payload.id_role,
        payload.libelle,
        payload.description || null,
        payload.niveau_hierarchique || 0,
        payload.is_global ?? true,
        payload.id_composante || null,
      ],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "ROLE_CREATED",
      targetType: "ROLE",
      targetId: payload.id_role,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ role: result.rows[0] });
  }),
);

router.post(
  "/roles/requests",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      role_propose: z.string(),
      description: z.string(),
      justificatif: z.string().optional().nullable(),
    });

    const payload = schema.parse(req.body);
    const result = await query(
      `insert into demande_role (id_user_createur, role_propose, description, justificatif, statut, date_creation)
       values ($1, $2, $3, $4, 'EN_ATTENTE', now())
       returning *`,
      [req.user.id_user, payload.role_propose, payload.description, payload.justificatif || null],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "ROLE_REQUEST_CREATED",
      targetType: "DEMANDE_ROLE",
      targetId: result.rows[0].id_demande_role,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ request: result.rows[0] });
  }),
);

router.get(
  "/roles/requests",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_ROLES,
      entiteId: null,
      yearId: null,
    });

    const result = await query(
      "select * from demande_role order by date_creation desc",
    );
    res.json({ items: result.rows });
  }),
);

router.patch(
  "/roles/requests/:id",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_ROLES,
      entiteId: null,
      yearId: null,
    });

    const schema = z.object({
      statut: z.enum(["VALIDEE", "REFUSEE"]),
      role_id: z.string().optional(),
      libelle: z.string().optional(),
    });

    const payload = schema.parse(req.body);
    const requestId = Number.parseInt(req.params.id, 10);

    const { rows } = await query(
      "select * from demande_role where id_demande_role = $1",
      [requestId],
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }

    const updated = await withTransaction(async (client) => {
      const request = rows[0];
      const updateResult = await client.query(
        `update demande_role
         set statut = $1, id_user_validateur = $2, date_decision = now()
         where id_demande_role = $3
         returning *`,
        [payload.statut, req.user.id_user, requestId],
      );

      if (payload.statut === "VALIDEE") {
        const roleId = payload.role_id || request.role_propose;
        await client.query(
          `insert into role (id_role, libelle, description, niveau_hierarchique, is_global)
           values ($1, $2, $3, $4, false)
           on conflict (id_role) do nothing`,
          [roleId, payload.libelle || request.role_propose, request.description, 0],
        );
      }

      await logAudit({
        actorId: req.user.id_user,
        action: "ROLE_REQUEST_DECISION",
        targetType: "DEMANDE_ROLE",
        targetId: requestId,
        beforeValue: request,
        afterValue: updateResult.rows[0],
      });

      return updateResult.rows[0];
    });

    res.json({ request: updated });
  }),
);

router.get(
  "/affectations",
  asyncHandler(async (req, res) => {
    const params = [];
    const conditions = [];

    if (req.query.userId) {
      params.push(Number.parseInt(req.query.userId, 10));
      conditions.push(`a.id_user = $${params.length}`);
    }
    if (req.query.entiteId) {
      params.push(Number.parseInt(req.query.entiteId, 10));
      conditions.push(`a.id_entite = $${params.length}`);
    }
    if (req.query.yearId) {
      params.push(Number.parseInt(req.query.yearId, 10));
      conditions.push(`a.id_annee = $${params.length}`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query(
      `select a.*, u.nom, u.prenom, r.libelle as role_libelle, e.nom as entite_nom
       from affectation a
       join utilisateur u on u.id_user = a.id_user
       join role r on r.id_role = a.id_role
       join entite_structure e on e.id_entite = a.id_entite
       ${whereClause}
       order by a.date_debut desc`,
      params,
    );

    res.json({ items: result.rows });
  }),
);

router.post(
  "/affectations",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      id_user: z.number(),
      id_role: z.string(),
      id_entite: z.number(),
      id_annee: z.number(),
      date_debut: z.string(),
      date_fin: z.string().nullable().optional(),
    });

    const payload = schema.parse(req.body);

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.ASSIGN_ROLE,
      entiteId: payload.id_entite,
      yearId: payload.id_annee,
    });

    const canGrant = await canGrantRole({
      actorId: req.user.id_user,
      roleId: payload.id_role,
      entiteId: payload.id_entite,
      yearId: payload.id_annee,
    });
    if (!canGrant) {
      return res.status(403).json({ error: "ROLE_GRANT_FORBIDDEN" });
    }

    const result = await query(
      `insert into affectation (id_user, id_role, id_entite, id_annee, date_debut, date_fin)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        payload.id_user,
        payload.id_role,
        payload.id_entite,
        payload.id_annee,
        payload.date_debut,
        payload.date_fin || null,
      ],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "AFFECTATION_CREATED",
      targetType: "AFFECTATION",
      targetId: result.rows[0].id_affectation,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ affectation: result.rows[0] });
  }),
);

router.delete(
  "/affectations/:id",
  asyncHandler(async (req, res) => {
    const affectationId = Number.parseInt(req.params.id, 10);
    const { rows } = await query(
      "select * from affectation where id_affectation = $1",
      [affectationId],
    );
    const affectation = rows[0];
    if (!affectation) {
      return res.status(404).json({ error: "AFFECTATION_NOT_FOUND" });
    }

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.ASSIGN_ROLE,
      entiteId: affectation.id_entite,
      yearId: affectation.id_annee,
    });

    await withTransaction(async (client) => {
      await client.query("delete from affectation where id_affectation = $1", [affectationId]);

      await logAudit({
        actorId: req.user.id_user,
        action: "AFFECTATION_DELETED",
        targetType: "AFFECTATION",
        targetId: affectationId,
        beforeValue: affectation,
        afterValue: null,
      });

      await cleanupDelegationsForDelegator(client, affectation.id_user, affectation.id_annee);
    });

    res.status(204).send();
  }),
);

router.post(
  "/affectations/:id/contact",
  asyncHandler(async (req, res) => {
    const affectationId = Number.parseInt(req.params.id, 10);
    const schema = z.object({
      email_fonctionnelle: z.string().email().optional().nullable(),
      type_email: z.string().optional().nullable(),
    });

    const payload = schema.parse(req.body);

    const { rows } = await query(
      "select * from affectation where id_affectation = $1",
      [affectationId],
    );
    const affectation = rows[0];
    if (!affectation) {
      return res.status(404).json({ error: "AFFECTATION_NOT_FOUND" });
    }

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.ASSIGN_ROLE,
      entiteId: affectation.id_entite,
      yearId: affectation.id_annee,
    });

    await ensureEmailAllowed(payload.email_fonctionnelle, req.user.id_user, affectation.id_annee);

    const result = await query(
      `insert into contact_role (id_affectation, email_fonctionnelle, type_email)
       values ($1, $2, $3)
       returning *`,
      [affectationId, payload.email_fonctionnelle || null, payload.type_email || null],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "CONTACT_ROLE_CREATED",
      targetType: "CONTACT_ROLE",
      targetId: result.rows[0].id_contact_role,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ contact: result.rows[0] });
  }),
);

router.get(
  "/delegations",
  asyncHandler(async (req, res) => {
    const params = [];
    const conditions = [];

    if (req.query.delegantId) {
      params.push(Number.parseInt(req.query.delegantId, 10));
      conditions.push(`d.delegant_id = $${params.length}`);
    }
    if (req.query.delegataireId) {
      params.push(Number.parseInt(req.query.delegataireId, 10));
      conditions.push(`d.delegataire_id = $${params.length}`);
    }
    if (req.query.entiteId) {
      params.push(Number.parseInt(req.query.entiteId, 10));
      conditions.push(`d.id_entite = $${params.length}`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query(
      `select d.*, u1.nom as delegant_nom, u2.nom as delegataire_nom, e.nom as entite_nom
       from delegation d
       join utilisateur u1 on u1.id_user = d.delegant_id
       join utilisateur u2 on u2.id_user = d.delegataire_id
       join entite_structure e on e.id_entite = d.id_entite
       ${whereClause}
       order by d.date_debut desc`,
      params,
    );

    res.json({ items: result.rows });
  }),
);

router.post(
  "/delegations",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      delegataire_id: z.number(),
      id_entite: z.number(),
      role_id: z.string().optional().nullable(),
      type_droit: z.string().optional().nullable(),
      date_debut: z.string(),
      date_fin: z.string().optional().nullable(),
    });

    const payload = schema.parse(req.body);
    const actorId = req.user.id_user;

    if (payload.delegataire_id === actorId) {
      return res.status(400).json({ error: "CANNOT_DELEGATE_TO_SELF" });
    }

    const delegationPermissions = payload.role_id
      ? getRolePermissions(payload.role_id)
      : [normalizeDelegationPermission(payload.type_droit)];

    if (!delegationPermissions.length || delegationPermissions.some((perm) => !perm)) {
      return res.status(400).json({ error: "INVALID_DELEGATION_RIGHT" });
    }

    for (const perm of delegationPermissions) {
      const allowed = await hasPermission({
        userId: actorId,
        permission: perm,
        entiteId: payload.id_entite,
        yearId: null,
      });
      if (!allowed) {
        return res.status(403).json({ error: "DELEGATION_FORBIDDEN" });
      }
    }

    const { rows: delegateeAffectations } = await query(
      `select a.id_entite
       from affectation a
       where a.id_user = $1`,
      [payload.delegataire_id],
    );

    const isSubordinate = await Promise.all(
      delegateeAffectations.map((aff) =>
        isEntiteDescendant(payload.id_entite, aff.id_entite),
      ),
    );

    if (!isSubordinate.some(Boolean)) {
      return res.status(400).json({ error: "DELEGATEE_OUT_OF_SCOPE" });
    }

    const result = await query(
      `insert into delegation (delegant_id, delegataire_id, id_entite, id_role, type_droit, date_debut, date_fin, statut)
       values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       returning *`,
      [
        actorId,
        payload.delegataire_id,
        payload.id_entite,
        payload.role_id || null,
        payload.type_droit || null,
        payload.date_debut,
        payload.date_fin || null,
      ],
    );

    await logAudit({
      actorId,
      action: "DELEGATION_CREATED",
      targetType: "DELEGATION",
      targetId: result.rows[0].id_delegation,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ delegation: result.rows[0] });
  }),
);

router.patch(
  "/delegations/:id/revoke",
  asyncHandler(async (req, res) => {
    const delegationId = Number.parseInt(req.params.id, 10);
    const { rows } = await query(
      "select * from delegation where id_delegation = $1",
      [delegationId],
    );
    const delegation = rows[0];
    if (!delegation) {
      return res.status(404).json({ error: "DELEGATION_NOT_FOUND" });
    }

    const actorId = req.user.id_user;
    const isOwner = delegation.delegant_id === actorId;
    if (!isOwner) {
      await ensureAnyPermission({
        userId: actorId,
        permissions: [PERMISSIONS.MANAGE_RESPONSABLES, PERMISSIONS.MANAGE_ROLES],
        entiteId: delegation.id_entite,
        yearId: null,
      });
    }

    await withTransaction(async (client) => {
      await client.query(
        "update delegation set statut = 'ANNULEE', date_fin = current_date where id_delegation = $1",
        [delegationId],
      );

      await logAudit({
        actorId,
        action: "DELEGATION_REVOKED",
        targetType: "DELEGATION",
        targetId: delegationId,
        beforeValue: delegation,
        afterValue: { ...delegation, statut: "ANNULEE" },
      });

      const yearId = await getCurrentYearId();
      await cleanupDelegationsForDelegator(client, delegation.delegataire_id, yearId);
    });

    res.status(204).send();
  }),
);

router.get(
  "/years",
  asyncHandler(async (_req, res) => {
    const result = await query("select * from annee_universitaire order by date_debut desc");
    res.json({ items: result.rows });
  }),
);

router.post(
  "/years",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_YEARS,
      entiteId: null,
      yearId: null,
    });

    const schema = z.object({
      libelle: z.string(),
      date_debut: z.string(),
      date_fin: z.string(),
      statut: z.enum(["EN_COURS", "PREPARATION", "ARCHIVEE"]),
      id_annee_source: z.number().optional().nullable(),
    });

    const payload = schema.parse(req.body);
    const result = await query(
      `insert into annee_universitaire (libelle, date_debut, date_fin, statut, id_annee_source)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [payload.libelle, payload.date_debut, payload.date_fin, payload.statut, payload.id_annee_source || null],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "YEAR_CREATED",
      targetType: "ANNEE_UNIVERSITAIRE",
      targetId: result.rows[0].id_annee,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ year: result.rows[0] });
  }),
);

router.post(
  "/years/:id/clone",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_YEARS,
      entiteId: null,
      yearId: null,
    });

    const sourceYearId = Number.parseInt(req.params.id, 10);
    const schema = z.object({
      libelle: z.string(),
      date_debut: z.string(),
      date_fin: z.string(),
      statut: z.enum(["EN_COURS", "PREPARATION", "ARCHIVEE"]),
      copy_affectations: z.boolean().optional(),
    });

    const payload = schema.parse(req.body);

    const created = await withTransaction(async (client) => {
      const newYearResult = await client.query(
        `insert into annee_universitaire (libelle, date_debut, date_fin, statut, id_annee_source)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [payload.libelle, payload.date_debut, payload.date_fin, payload.statut, sourceYearId],
      );
      const newYear = newYearResult.rows[0];

      const { rows: entites } = await client.query(
        "select * from entite_structure where id_annee = $1 order by id_entite",
        [sourceYearId],
      );

      const mapping = new Map();

      for (const entite of entites) {
        const insertResult = await client.query(
          `insert into entite_structure (id_annee, id_entite_parent, type_entite, nom, tel_service, bureau_service)
           values ($1, $2, $3, $4, $5, $6)
           returning id_entite`,
          [
            newYear.id_annee,
            entite.id_entite_parent ? mapping.get(entite.id_entite_parent) || null : null,
            entite.type_entite,
            entite.nom,
            entite.tel_service,
            entite.bureau_service,
          ],
        );
        mapping.set(entite.id_entite, insertResult.rows[0].id_entite);
      }

      if (payload.copy_affectations) {
        const { rows: affs } = await client.query(
          "select * from affectation where id_annee = $1",
          [sourceYearId],
        );
        for (const aff of affs) {
          await client.query(
            `insert into affectation (id_user, id_role, id_entite, id_annee, date_debut, date_fin)
             values ($1, $2, $3, $4, $5, $6)`,
            [
              aff.id_user,
              aff.id_role,
              mapping.get(aff.id_entite) || aff.id_entite,
              newYear.id_annee,
              aff.date_debut,
              aff.date_fin,
            ],
          );
        }
      }

      await logAudit({
        actorId: req.user.id_user,
        action: "YEAR_CLONED",
        targetType: "ANNEE_UNIVERSITAIRE",
        targetId: newYear.id_annee,
        beforeValue: { sourceYearId },
        afterValue: newYear,
      });

      return newYear;
    });

    res.status(201).json({ year: created });
  }),
);

router.get(
  "/years/compare",
  asyncHandler(async (req, res) => {
    const fromId = Number.parseInt(req.query.from, 10);
    const toId = Number.parseInt(req.query.to, 10);
    if (!fromId || !toId) {
      return res.status(400).json({ error: "MISSING_YEAR_IDS" });
    }

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.AUDIT_VIEW,
      entiteId: null,
      yearId: null,
    });

    const [fromResult, toResult] = await Promise.all([
      query(
        "select id_user, id_role, id_entite from affectation where id_annee = $1",
        [fromId],
      ),
      query(
        "select id_user, id_role, id_entite from affectation where id_annee = $1",
        [toId],
      ),
    ]);

    const serialize = (row) => `${row.id_user}:${row.id_role}:${row.id_entite}`;
    const fromSet = new Set(fromResult.rows.map(serialize));
    const toSet = new Set(toResult.rows.map(serialize));

    const added = toResult.rows.filter((row) => !fromSet.has(serialize(row)));
    const removed = fromResult.rows.filter((row) => !toSet.has(serialize(row)));

    res.json({ added, removed });
  }),
);

router.get(
  "/entites",
  asyncHandler(async (req, res) => {
    const yearId = req.query.yearId ? Number.parseInt(req.query.yearId, 10) : await getCurrentYearId();
    const result = await query(
      "select * from entite_structure where id_annee = $1 order by id_entite",
      [yearId],
    );
    res.json({ items: result.rows });
  }),
);

router.post(
  "/entites",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      id_annee: z.number(),
      id_entite_parent: z.number().optional().nullable(),
      type_entite: z.enum(["COMPOSANTE", "DEPARTEMENT", "MENTION", "PARCOURS", "NIVEAU"]),
      nom: z.string(),
      tel_service: z.string().optional().nullable(),
      bureau_service: z.string().optional().nullable(),
    });

    const payload = schema.parse(req.body);

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_RESPONSABLES,
      entiteId: payload.id_entite_parent || null,
      yearId: payload.id_annee,
    });

    const result = await query(
      `insert into entite_structure (id_annee, id_entite_parent, type_entite, nom, tel_service, bureau_service)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        payload.id_annee,
        payload.id_entite_parent || null,
        payload.type_entite,
        payload.nom,
        payload.tel_service || null,
        payload.bureau_service || null,
      ],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "ENTITE_CREATED",
      targetType: "ENTITE_STRUCTURE",
      targetId: result.rows[0].id_entite,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ entite: result.rows[0] });
  }),
);

router.patch(
  "/entites/:id",
  asyncHandler(async (req, res) => {
    const entiteId = Number.parseInt(req.params.id, 10);
    const { rows } = await query(
      "select * from entite_structure where id_entite = $1",
      [entiteId],
    );
    const entite = rows[0];
    if (!entite) {
      return res.status(404).json({ error: "ENTITE_NOT_FOUND" });
    }

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.MANAGE_RESPONSABLES,
      entiteId: entite.id_entite_parent || entite.id_entite,
      yearId: entite.id_annee,
    });

    const schema = z.object({
      nom: z.string().optional(),
      tel_service: z.string().optional().nullable(),
      bureau_service: z.string().optional().nullable(),
    });
    const payload = schema.parse(req.body);

    const result = await query(
      `update entite_structure
       set nom = coalesce($1, nom),
           tel_service = coalesce($2, tel_service),
           bureau_service = coalesce($3, bureau_service)
       where id_entite = $4
       returning *`,
      [payload.nom || null, payload.tel_service || null, payload.bureau_service || null, entiteId],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "ENTITE_UPDATED",
      targetType: "ENTITE_STRUCTURE",
      targetId: entiteId,
      beforeValue: entite,
      afterValue: result.rows[0],
    });

    res.json({ entite: result.rows[0] });
  }),
);

router.get(
  "/organigrammes",
  asyncHandler(async (req, res) => {
    const params = [];
    let whereClause = "";
    if (req.query.yearId) {
      params.push(Number.parseInt(req.query.yearId, 10));
      whereClause = `where id_annee = $${params.length}`;
    }
    const result = await query(
      `select * from organigramme ${whereClause} order by generated_at desc`,
      params,
    );
    res.json({ items: result.rows });
  }),
);

router.get(
  "/organigrammes/:id/tree",
  asyncHandler(async (req, res) => {
    const orgaId = Number.parseInt(req.params.id, 10);
    const { rows } = await query(
      "select * from organigramme where id_organigramme = $1",
      [orgaId],
    );
    const organigramme = rows[0];
    if (!organigramme) {
      return res.status(404).json({ error: "ORG_NOT_FOUND" });
    }

    const tree = await buildOrganigrammeTree(
      organigramme.id_annee,
      organigramme.id_entite_racine,
    );
    if (!tree) {
      return res.status(404).json({ error: "ROOT_ENTITE_NOT_FOUND" });
    }

    res.json({ organigramme, arbre: tree });
  }),
);

router.get(
  "/organigrammes/latest",
  asyncHandler(async (req, res) => {
    const yearId = req.query.yearId ? Number.parseInt(req.query.yearId, 10) : await getCurrentYearId();
    if (!yearId) {
      return res.status(404).json({ error: "YEAR_NOT_FOUND" });
    }

    const { rows: orgaRows } = await query(
      "select * from organigramme where id_annee = $1 order by generated_at desc limit 1",
      [yearId],
    );
    const organigramme = orgaRows[0] || null;

    let rootEntiteId = organigramme?.id_entite_racine || null;
    if (!rootEntiteId) {
      const { rows: rootRows } = await query(
        "select id_entite from entite_structure where id_annee = $1 and id_entite_parent is null order by id_entite limit 1",
        [yearId],
      );
      rootEntiteId = rootRows[0]?.id_entite || null;
    }

    if (!rootEntiteId) {
      return res.status(404).json({ error: "ROOT_ENTITE_NOT_FOUND" });
    }

    const tree = await buildOrganigrammeTree(yearId, rootEntiteId);
    if (!tree) {
      return res.status(404).json({ error: "ORG_NOT_FOUND" });
    }

    res.json({ organigramme, arbre: tree });
  }),
);

router.get(
  "/exports/responsables",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.EXPORT_DATA,
      entiteId: null,
      yearId: null,
    });

    const yearId = req.query.yearId ? Number.parseInt(req.query.yearId, 10) : null;
    const params = [];
    let yearClause = "";
    if (yearId) {
      params.push(yearId);
      yearClause = `where a.id_annee = $${params.length}`;
    }

    const result = await query(
      `select u.nom, u.prenom, u.email_institutionnel, r.libelle as role, e.nom as entite, a.id_annee
       from affectation a
       join utilisateur u on u.id_user = a.id_user
       join role r on r.id_role = a.id_role
       join entite_structure e on e.id_entite = a.id_entite
       ${yearClause}
       order by u.nom, u.prenom`,
      params,
    );

    res.json({ items: result.rows });
  }),
);

router.post(
  "/organigrammes/generate",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      id_annee: z.number(),
      id_entite_racine: z.number(),
    });
    const payload = schema.parse(req.body);

    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.GENERATE_ORG,
      entiteId: payload.id_entite_racine,
      yearId: payload.id_annee,
    });

    const root = await buildOrganigrammeTree(payload.id_annee, payload.id_entite_racine);
    if (!root) {
      return res.status(404).json({ error: "ROOT_ENTITE_NOT_FOUND" });
    }

    const saved = await query(
      `insert into organigramme (id_annee, id_entite_racine, generated_by, generated_at, est_fige, export_format)
       values ($1, $2, $3, now(), false, 'PDF')
       returning *`,
      [payload.id_annee, payload.id_entite_racine, req.user.id_user],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "ORG_GENERATED",
      targetType: "ORGANIGRAMME",
      targetId: saved.rows[0].id_organigramme,
      beforeValue: null,
      afterValue: saved.rows[0],
    });

    res.status(201).json({ organigramme: saved.rows[0], arbre: root });
  }),
);

router.patch(
  "/organigrammes/:id/freeze",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.FREEZE_ORG,
      entiteId: null,
      yearId: null,
    });

    const orgaId = Number.parseInt(req.params.id, 10);
    const result = await query(
      `update organigramme set est_fige = true where id_organigramme = $1 returning *`,
      [orgaId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "ORG_NOT_FOUND" });
    }

    await logAudit({
      actorId: req.user.id_user,
      action: "ORG_FROZEN",
      targetType: "ORGANIGRAMME",
      targetId: orgaId,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.json({ organigramme: result.rows[0] });
  }),
);

router.get(
  "/audit",
  asyncHandler(async (req, res) => {
    await ensurePermission({
      userId: req.user.id_user,
      permission: PERMISSIONS.AUDIT_VIEW,
      entiteId: null,
      yearId: null,
    });

    const result = await query(
      "select * from journal_audit order by horodatage desc limit 500",
    );
    res.json({ items: result.rows });
  }),
);

router.post(
  "/demandes",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      cible_type: z.string(),
      cible_id: z.string(),
      champ: z.string(),
      valeur_proposee: z.string(),
    });
    const payload = schema.parse(req.body);

    const result = await query(
      `insert into demande_modification (auteur_id, cible_type, cible_id, champ, valeur_proposee, statut, date_creation)
       values ($1, $2, $3, $4, $5, 'EN_ATTENTE', now())
       returning *`,
      [req.user.id_user, payload.cible_type, payload.cible_id, payload.champ, payload.valeur_proposee],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "DEMANDE_CREATED",
      targetType: "DEMANDE_MODIFICATION",
      targetId: result.rows[0].id_demande,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ demande: result.rows[0] });
  }),
);

router.get(
  "/demandes",
  asyncHandler(async (req, res) => {
    await ensureAnyPermission({
      userId: req.user.id_user,
      permissions: [PERMISSIONS.MANAGE_RESPONSABLES, PERMISSIONS.MANAGE_ROLES],
      entiteId: null,
      yearId: null,
    });

    const params = [];
    const conditions = [];
    if (req.query.statut) {
      params.push(req.query.statut);
      conditions.push(`statut = $${params.length}`);
    }
    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query(
      `select * from demande_modification ${whereClause} order by date_creation desc`,
      params,
    );
    res.json({ items: result.rows });
  }),
);

router.patch(
  "/demandes/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      statut: z.enum(["VALIDEE", "REFUSEE"]),
    });
    const payload = schema.parse(req.body);

    await ensureAnyPermission({
      userId: req.user.id_user,
      permissions: [PERMISSIONS.MANAGE_RESPONSABLES, PERMISSIONS.MANAGE_ROLES],
      entiteId: null,
      yearId: null,
    });

    const demandeId = Number.parseInt(req.params.id, 10);
    const result = await query(
      `update demande_modification
       set statut = $1, validateur_id = $2, date_decision = now()
       where id_demande = $3
       returning *`,
      [payload.statut, req.user.id_user, demandeId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "DEMANDE_NOT_FOUND" });
    }

    await logAudit({
      actorId: req.user.id_user,
      action: "DEMANDE_DECISION",
      targetType: "DEMANDE_MODIFICATION",
      targetId: demandeId,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.json({ demande: result.rows[0] });
  }),
);

router.post(
  "/signalements",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      description: z.string(),
      id_entite_cible: z.number().optional().nullable(),
    });
    const payload = schema.parse(req.body);

    const result = await query(
      `insert into signalement (auteur_id, id_entite_cible, description, statut, date_creation)
       values ($1, $2, $3, 'OUVERT', now())
       returning *`,
      [req.user.id_user, payload.id_entite_cible || null, payload.description],
    );

    await logAudit({
      actorId: req.user.id_user,
      action: "SIGNALEMENT_CREATED",
      targetType: "SIGNALEMENT",
      targetId: result.rows[0].id_signalement,
      beforeValue: null,
      afterValue: result.rows[0],
    });

    res.status(201).json({ signalement: result.rows[0] });
  }),
);

router.get(
  "/signalements",
  asyncHandler(async (req, res) => {
    await ensureAnyPermission({
      userId: req.user.id_user,
      permissions: [PERMISSIONS.MANAGE_RESPONSABLES, PERMISSIONS.MANAGE_ROLES],
      entiteId: null,
      yearId: null,
    });

    const params = [];
    const conditions = [];
    if (req.query.statut) {
      params.push(req.query.statut);
      conditions.push(`statut = $${params.length}`);
    }
    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query(
      `select s.*,
              ua.nom as auteur_nom, ua.prenom as auteur_prenom,
              ut.nom as traitant_nom, ut.prenom as traitant_prenom,
              uc.nom as cloture_nom, uc.prenom as cloture_prenom
       from signalement s
       left join utilisateur ua on ua.id_user = s.auteur_id
       left join utilisateur ut on ut.id_user = s.traitant_id
       left join utilisateur uc on uc.id_user = s.cloture_par_id
       ${whereClause}
       order by s.date_creation desc`,
      params,
    );
    res.json({ items: result.rows });
  }),
);

router.patch(
  "/signalements/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      statut: z.enum(["OUVERT", "EN_COURS", "CLOTURE"]),
      commentaire: z.string().optional().nullable(),
    });
    const payload = schema.parse(req.body);

    const signalementId = Number.parseInt(req.params.id, 10);
    const { rows: existingRows } = await query(
      "select * from signalement where id_signalement = $1",
      [signalementId],
    );
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ error: "SIGNALEMENT_NOT_FOUND" });
    }

    const isScOrAdmin = await isServicesCentrauxOrAdmin(req.user.id_user);
    if (!isScOrAdmin) {
      return res.status(403).json({ error: "SIGNALEMENT_FORBIDDEN" });
    }

    let updateResult;
    if (payload.statut === "EN_COURS") {
      if (existing.statut !== "OUVERT") {
        return res.status(400).json({ error: "SIGNALEMENT_NOT_OPEN" });
      }
      updateResult = await query(
        `update signalement
         set statut = 'EN_COURS',
             traitant_id = $1,
             date_prise_en_charge = now(),
             commentaire_prise_en_charge = coalesce($2, commentaire_prise_en_charge)
         where id_signalement = $3
         returning *`,
        [req.user.id_user, payload.commentaire || null, signalementId],
      );
    } else if (payload.statut === "CLOTURE") {
      if (existing.statut !== "EN_COURS") {
        return res.status(400).json({ error: "SIGNALEMENT_NOT_IN_PROGRESS" });
      }
      if (existing.traitant_id && existing.traitant_id !== req.user.id_user) {
        return res.status(403).json({ error: "SIGNALEMENT_NOT_ASSIGNED" });
      }
      if (!payload.commentaire || !payload.commentaire.trim()) {
        return res.status(400).json({ error: "SIGNALEMENT_COMMENT_REQUIRED" });
      }
      updateResult = await query(
        `update signalement
         set statut = 'CLOTURE',
             cloture_par_id = $1,
             date_traitement = now(),
             commentaire_cloture = $2
         where id_signalement = $3
         returning *`,
        [req.user.id_user, payload.commentaire.trim(), signalementId],
      );
    } else {
      return res.status(400).json({ error: "SIGNALEMENT_STATUS_INVALID" });
    }

    if (!updateResult.rows[0]) {
      return res.status(404).json({ error: "SIGNALEMENT_NOT_FOUND" });
    }

    await logAudit({
      actorId: req.user.id_user,
      action: "SIGNALEMENT_UPDATED",
      targetType: "SIGNALEMENT",
      targetId: signalementId,
      beforeValue: existing,
      afterValue: updateResult.rows[0],
    });

    res.json({ signalement: updateResult.rows[0] });
  }),
);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const result = await query(
      `select * from notification where destinataire_id = $1 order by date_envoi desc`,
      [req.user.id_user],
    );
    res.json({ items: result.rows });
  }),
);

module.exports = router;
