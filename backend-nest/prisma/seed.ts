import {
  PrismaClient,
  entite_type,
  utilisateur_statut,
  annee_statut,
  composante_type,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

/** Types de diplômes de référence (Sprint 4 §9 — 39 types identifiés) */
const TYPES_DIPLOMES = [
  'Licence', 'Licence professionnelle', 'BUT', 'Master', 'Master professionnel',
  'Master recherche', 'Ingénieur', 'Doctorat', 'DUT', "Diplôme d'État",
  "Diplôme d'études spécialisées", "Diplôme d'études spécialisées complémentaires",
  'Capacité', 'Certificat de capacité', 'DEUST', 'DAEU', "Diplôme d'université",
  'DU', 'DIU', 'MBA', 'MS', 'MSc', 'Magistère', "Titre d'ingénieur",
  'DNSEP', 'DNAT', 'BTS', 'BTSA', 'Classe préparatoire', 'CPGE',
  'Certificat de spécialisation', 'CQP', 'Titre RNCP', 'Certificat de compétences',
  'HDR', "Diplôme d'accès aux études universitaires",
  'Bachelor universitaire de technologie', 'Diplôme national de master',
  'Diplôme de comptabilité et de gestion',
];

/** Rôles de référence (alignés Sprint 4) */
const ROLES: Array<{
  id: string;
  libelle: string;
  description?: string;
  niveau: number;
  isGlobal: boolean;
  estAdministratif: boolean;
  estTransverse: boolean;
}> = [
  { id: 'services-centraux',            libelle: 'Services centraux',            niveau: 0,  isGlobal: true,  estAdministratif: false, estTransverse: false },
  { id: 'administrateur',               libelle: 'Administrateur',               niveau: 0,  isGlobal: true,  estAdministratif: false, estTransverse: false },
  { id: 'directeur-composante',         libelle: 'Directeur de composante',      niveau: 1,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'directeur-administratif',      libelle: 'Directeur administratif',      niveau: 2,  isGlobal: false, estAdministratif: true,  estTransverse: false },
  { id: 'directeur-administratif-adjoint', libelle: 'Directeur administratif adjoint', niveau: 3, isGlobal: false, estAdministratif: true, estTransverse: false },
  { id: 'directeur-departement',        libelle: 'Directeur de département',     niveau: 4,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'directeur-adjoint-licence',    libelle: 'Directeur adjoint licence',    niveau: 5,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'responsable-service-pedagogique', libelle: 'Responsable service pédagogique', niveau: 5, isGlobal: false, estAdministratif: true, estTransverse: false },
  { id: 'directeur-mention',            libelle: 'Directeur de mention',         niveau: 6,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'directeur-specialite',         libelle: 'Directeur de spécialité',      niveau: 7,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'responsable-formation',        libelle: 'Responsable de formation',     niveau: 8,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'responsable-annee',            libelle: "Responsable d'année",          niveau: 9,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'directeur-etudes',             libelle: 'Directeur des études',         niveau: 9,  isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'responsable-qualite',          libelle: 'Responsable qualité',          niveau: 10, isGlobal: false, estAdministratif: false, estTransverse: true  },
  { id: 'responsable-international',    libelle: 'Responsable international',    niveau: 10, isGlobal: false, estAdministratif: false, estTransverse: true  },
  { id: 'referent-commun',              libelle: 'Référent commun',              niveau: 10, isGlobal: false, estAdministratif: false, estTransverse: true  },
  { id: 'directeur-adjoint-ecole',      libelle: "Directeur adjoint d'école",    niveau: 10, isGlobal: false, estAdministratif: false, estTransverse: true  },
  { id: 'secretariat-pedagogique',      libelle: 'Secrétariat pédagogique',      niveau: 11, isGlobal: false, estAdministratif: true,  estTransverse: false },
  { id: 'utilisateur-simple',           libelle: 'Utilisateur simple',           niveau: 20, isGlobal: false, estAdministratif: false, estTransverse: false },
  { id: 'lecture-seule',                libelle: 'Lecture seule',                niveau: 99, isGlobal: true,  estAdministratif: false, estTransverse: false },
];

interface SeedUser {
  login: string;
  nom: string;
  prenom: string;
  roleId: string;
  entiteKey: keyof EntitesIds;
}

interface EntitesIds {
  composante: bigint;
  departement: bigint;
  mention: bigint;
  parcours: bigint;
  niveau: bigint;
}

const DEMO_SUPERVISOR_BY_LOGIN: Partial<Record<string, string>> = {
  'da.infocom': 'dc.infocom',
  'dir.dept.info': 'dc.infocom',
  'dir.mention.l3': 'dir.dept.info',
  'dir.spec.ia': 'dir.mention.l3',
  'resp.form.info': 'dir.spec.ia',
  'resp.annee.l2': 'resp.form.info',
  'ens.dupont': 'dir.dept.info',
  'viewer.readonly': 'dir.dept.info',
};

async function ensureRole(params: {
  id: string;
  libelle: string;
  description?: string;
  niveau: number;
  isGlobal: boolean;
  estAdministratif: boolean;
  estTransverse: boolean;
  id_composante?: bigint | null;
}): Promise<void> {
  await prisma.role.upsert({
    where: { id_role: params.id },
    update: {
      est_administratif: params.estAdministratif,
      est_transverse: params.estTransverse,
    },
    create: {
      id_role: params.id,
      libelle: params.libelle,
      description: params.description ?? null,
      niveau_hierarchique: params.niveau,
      is_global: params.isGlobal,
      est_administratif: params.estAdministratif,
      est_transverse: params.estTransverse,
      id_composante: params.id_composante ?? null,
    },
  });
}

async function main() {
  // ----- 1. Types de diplômes -----
  for (const libelle of TYPES_DIPLOMES) {
    await prisma.type_diplome.upsert({
      where: { libelle },
      update: {},
      create: { libelle, is_active: true },
    });
  }

  // ----- 2. Rôles -----
  for (const r of ROLES) {
    await ensureRole({
      id: r.id,
      libelle: r.libelle,
      niveau: r.niveau,
      isGlobal: r.isGlobal,
      estAdministratif: r.estAdministratif,
      estTransverse: r.estTransverse,
    });
  }

  // ----- 3. Année universitaire -----
  let annee = await prisma.annee_universitaire.findFirst({
    where: { statut: annee_statut.EN_COURS },
    orderBy: { id_annee: 'desc' },
  });
  if (!annee) {
    annee = await prisma.annee_universitaire.create({
      data: {
        libelle: '2025-2026',
        date_debut: new Date('2025-09-01'),
        date_fin: new Date('2026-08-31'),
        statut: annee_statut.EN_COURS,
      },
    });
  }

  // ----- 4. Récupération des id types diplômes -----
  const tdLicence = await prisma.type_diplome.findUnique({ where: { libelle: 'Licence' } });
  const tdMaster  = await prisma.type_diplome.findUnique({ where: { libelle: 'Master' } });
  const tdIng     = await prisma.type_diplome.findUnique({ where: { libelle: 'Ingénieur' } });

  // ----- 5. Structure : Licences 2025-2030 -----
  const existingLicences = await prisma.entite_structure.findFirst({
    where: { id_annee: annee.id_annee, type_entite: entite_type.COMPOSANTE, nom: 'Licences 2025-2030' },
  });

  let firstComposante: bigint;
  let firstDepartement: bigint;
  let firstMention: bigint;
  let firstParcours: bigint;
  let firstNiveau: bigint;

  if (existingLicences) {
    const tree = await prisma.entite_structure.findMany({
      where: { id_annee: annee.id_annee },
      orderBy: { id_entite: 'asc' },
    });
    const byParent = new Map<string, typeof tree>();
    for (const e of tree) {
      const key = e.id_entite_parent?.toString() ?? 'root';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(e);
    }
    firstComposante  = existingLicences.id_entite;
    firstDepartement = byParent.get(firstComposante.toString())![0].id_entite;
    firstMention     = byParent.get(firstDepartement.toString())![0].id_entite;
    firstParcours    = byParent.get(firstMention.toString())![0].id_entite;
    firstNiveau      = byParent.get(firstParcours.toString())![0].id_entite;
  } else {
    const compLicences = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: null, type_entite: entite_type.COMPOSANTE, nom: 'Licences 2025-2030', tel_service: null, bureau_service: null },
    });
    await prisma.composante.create({
      data: {
        id_entite: compLicences.id_entite,
        code_composante: null,
        type_composante: composante_type.UFR,
        site_web: null,
        mail_fonctionnel: null,
        mail_institutionnel: null,
        campus: null,
      },
    });
    firstComposante = compLicences.id_entite;

    const deptLicences = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: compLicences.id_entite, type_entite: entite_type.DEPARTEMENT, nom: 'Formations licence', tel_service: null, bureau_service: null },
    });
    await prisma.departement.create({ data: { id_entite: deptLicences.id_entite, code_interne: null } });
    firstDepartement = deptLicences.id_entite;

    const mentionsLicences = [
      { nom: 'Licence Mention Droit',             type_diplome: 'Licence', cycle: 1 },
      { nom: 'Licence Mention Science politique',  type_diplome: 'Licence', cycle: 1 },
      { nom: 'Licence Mention AES',               type_diplome: 'Licence', cycle: 1 },
    ];
    let firstMentionId:  bigint | null = null;
    let firstParcoursId: bigint | null = null;
    let firstNiveauId:   bigint | null = null;

    for (const m of mentionsLicences) {
      const mentionE = await prisma.entite_structure.create({
        data: { id_annee: annee.id_annee, id_entite_parent: deptLicences.id_entite, type_entite: entite_type.MENTION, nom: m.nom, tel_service: null, bureau_service: null },
      });
      await prisma.mention.create({
        data: { id_entite: mentionE.id_entite, type_diplome: m.type_diplome, cycle: m.cycle, id_type_diplome: tdLicence?.id_type_diplome ?? null },
      });
      if (firstMentionId === null) firstMentionId = mentionE.id_entite;

      const parcoursE = await prisma.entite_structure.create({
        data: { id_annee: annee.id_annee, id_entite_parent: mentionE.id_entite, type_entite: entite_type.PARCOURS, nom: m.nom.replace('Licence Mention ', 'Licence '), tel_service: null, bureau_service: null },
      });
      await prisma.parcours.create({ data: { id_entite: parcoursE.id_entite, code_parcours: null } });
      if (firstParcoursId === null) firstParcoursId = parcoursE.id_entite;

      for (const libNiveau of ['L1', 'L2', 'L3']) {
        const niveauE = await prisma.entite_structure.create({
          data: { id_annee: annee.id_annee, id_entite_parent: parcoursE.id_entite, type_entite: entite_type.NIVEAU, nom: libNiveau, tel_service: null, bureau_service: null },
        });
        await prisma.niveau.create({ data: { id_entite: niveauE.id_entite, libelle_court: libNiveau } });
        if (firstNiveauId === null) firstNiveauId = niveauE.id_entite;
      }
    }
    firstMention  = firstMentionId!;
    firstParcours = firstParcoursId!;
    firstNiveau   = firstNiveauId!;
  }

  // ----- 6. Institut Galilée (code 903) -----
  const existingIG = await prisma.entite_structure.findFirst({
    where: { id_annee: annee.id_annee, type_entite: entite_type.COMPOSANTE, nom: 'Institut Galilée' },
  });
  if (!existingIG) {
    const compIG = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: null, type_entite: entite_type.COMPOSANTE, nom: 'Institut Galilée', tel_service: '01 49 40 30 00', bureau_service: 'Bâtiment A' },
    });
    await prisma.composante.create({
      data: {
        id_entite: compIG.id_entite,
        code_composante: '903',
        type_composante: composante_type.INSTITUT,
        site_web: 'https://galilee.univ-paris13.fr',
        mail_fonctionnel: 'directeur.galilee@univ-paris13.fr',
        mail_institutionnel: 'ig@univ-paris13.fr',
        campus: 'Villetaneuse',
      },
    });
    const deptIG = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: compIG.id_entite, type_entite: entite_type.DEPARTEMENT, nom: 'Département Informatique', tel_service: null, bureau_service: null },
    });
    await prisma.departement.create({ data: { id_entite: deptIG.id_entite, code_interne: 'INFO' } });

    const mentionIG = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: deptIG.id_entite, type_entite: entite_type.MENTION, nom: 'Mention Informatique', tel_service: null, bureau_service: null },
    });
    await prisma.mention.create({
      data: { id_entite: mentionIG.id_entite, type_diplome: 'Ingénieur', cycle: 2, id_type_diplome: tdIng?.id_type_diplome ?? null },
    });
    const parcoursIG = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: mentionIG.id_entite, type_entite: entite_type.PARCOURS, nom: 'Ingénierie Logicielle', tel_service: null, bureau_service: null },
    });
    await prisma.parcours.create({ data: { id_entite: parcoursIG.id_entite, code_parcours: 'IL' } });
  }

  // ----- 7. Masters Droit 2025-2030 -----
  const existingMastersDroit = await prisma.entite_structure.findFirst({
    where: { id_annee: annee.id_annee, type_entite: entite_type.COMPOSANTE, nom: 'Masters Droit 2025-2030' },
  });
  if (!existingMastersDroit) {
    const compDroit = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: null, type_entite: entite_type.COMPOSANTE, nom: 'Masters Droit 2025-2030', tel_service: null, bureau_service: null },
    });
    await prisma.composante.create({
      data: {
        id_entite: compDroit.id_entite,
        code_composante: null,
        type_composante: composante_type.UFR,
        site_web: null,
        mail_fonctionnel: null,
        mail_institutionnel: null,
        campus: null,
      },
    });
    const deptDroit = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: compDroit.id_entite, type_entite: entite_type.DEPARTEMENT, nom: 'Droit', tel_service: null, bureau_service: null },
    });
    await prisma.departement.create({ data: { id_entite: deptDroit.id_entite, code_interne: null } });

    for (const m of [
      { nom: 'Mention Droit', parcours: ['M1 Droit des affaires', 'M1 Droit Notarial', 'M1 Droit Public interne et européen', 'M1 Droit social', 'M2 Contentieux', 'M2 Droit des Activités numériques', 'M2 Droit immobilier'] },
      { nom: 'Mention Droit Notarial', parcours: ['M1 Droit Notarial', 'M2 Droit Notarial'] },
    ]) {
      const mentionE = await prisma.entite_structure.create({
        data: { id_annee: annee.id_annee, id_entite_parent: deptDroit.id_entite, type_entite: entite_type.MENTION, nom: m.nom, tel_service: null, bureau_service: null },
      });
      await prisma.mention.create({
        data: { id_entite: mentionE.id_entite, type_diplome: 'Master', cycle: 2, id_type_diplome: tdMaster?.id_type_diplome ?? null },
      });
      for (const nomP of m.parcours) {
        const parcoursE = await prisma.entite_structure.create({
          data: { id_annee: annee.id_annee, id_entite_parent: mentionE.id_entite, type_entite: entite_type.PARCOURS, nom: nomP, tel_service: null, bureau_service: null },
        });
        await prisma.parcours.create({ data: { id_entite: parcoursE.id_entite, code_parcours: null } });
        const libNiveau = nomP.startsWith('M1') ? 'M1' : 'M2';
        const niveauE = await prisma.entite_structure.create({
          data: { id_annee: annee.id_annee, id_entite_parent: parcoursE.id_entite, type_entite: entite_type.NIVEAU, nom: libNiveau, tel_service: null, bureau_service: null },
        });
        await prisma.niveau.create({ data: { id_entite: niveauE.id_entite, libelle_court: libNiveau } });
      }
    }
  }

  // ----- 8. Masters Science Politique 2025-2030 -----
  const existingMastersScPo = await prisma.entite_structure.findFirst({
    where: { id_annee: annee.id_annee, type_entite: entite_type.COMPOSANTE, nom: 'Masters Science Politique 2025-2030' },
  });
  if (!existingMastersScPo) {
    const compScPo = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: null, type_entite: entite_type.COMPOSANTE, nom: 'Masters Science Politique 2025-2030', tel_service: null, bureau_service: null },
    });
    await prisma.composante.create({
      data: {
        id_entite: compScPo.id_entite,
        code_composante: null,
        type_composante: composante_type.UFR,
        site_web: null,
        mail_fonctionnel: null,
        mail_institutionnel: null,
        campus: null,
      },
    });
    const deptScPo = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: compScPo.id_entite, type_entite: entite_type.DEPARTEMENT, nom: 'Science politique', tel_service: null, bureau_service: null },
    });
    await prisma.departement.create({ data: { id_entite: deptScPo.id_entite, code_interne: null } });

    const mentionScPo = await prisma.entite_structure.create({
      data: { id_annee: annee.id_annee, id_entite_parent: deptScPo.id_entite, type_entite: entite_type.MENTION, nom: 'Mention Science Politique', tel_service: null, bureau_service: null },
    });
    await prisma.mention.create({
      data: { id_entite: mentionScPo.id_entite, type_diplome: 'Master', cycle: 2, id_type_diplome: tdMaster?.id_type_diplome ?? null },
    });
    for (const nomP of [
      'M1 Action publique et Stratégies France - International',
      'M2 Politiques publiques et territoriales',
      'M2 Études Stratégiques',
      'M2 Coopération internationale et ONG',
      'M2 Politiques commerciales avec les pays émergents',
    ]) {
      const parcoursE = await prisma.entite_structure.create({
        data: { id_annee: annee.id_annee, id_entite_parent: mentionScPo.id_entite, type_entite: entite_type.PARCOURS, nom: nomP, tel_service: null, bureau_service: null },
      });
      await prisma.parcours.create({ data: { id_entite: parcoursE.id_entite, code_parcours: null } });
      const libNiveau = nomP.startsWith('M1') ? 'M1' : 'M2';
      const niveauE = await prisma.entite_structure.create({
        data: { id_annee: annee.id_annee, id_entite_parent: parcoursE.id_entite, type_entite: entite_type.NIVEAU, nom: libNiveau, tel_service: null, bureau_service: null },
      });
      await prisma.niveau.create({ data: { id_entite: niveauE.id_entite, libelle_court: libNiveau } });
    }
  }

  const entites: EntitesIds = {
    composante:  firstComposante,
    departement: firstDepartement,
    mention:     firstMention,
    parcours:    firstParcours,
    niveau:      firstNiveau,
  };

  // ----- 9. Utilisateurs de test -----
  const users: SeedUser[] = [
    { login: 'sc.admin',       nom: 'Admin',      prenom: 'Services',   roleId: 'services-centraux',   entiteKey: 'composante' },
    { login: 'dsi.tech',       nom: 'Tech',       prenom: 'DSI',        roleId: 'administrateur',      entiteKey: 'composante' },
    { login: 'dc.infocom',     nom: 'Infocom',    prenom: 'Directeur',  roleId: 'directeur-composante',entiteKey: 'composante' },
    { login: 'da.infocom',     nom: 'Infocom',    prenom: 'DA',         roleId: 'directeur-administratif', entiteKey: 'composante' },
    { login: 'dir.dept.info',  nom: 'Info',       prenom: 'Departement',roleId: 'directeur-departement',entiteKey: 'departement' },
    { login: 'dir.mention.l3', nom: 'L3',         prenom: 'Mention',    roleId: 'directeur-mention',   entiteKey: 'mention' },
    { login: 'dir.spec.ia',    nom: 'IA',         prenom: 'Specialite', roleId: 'directeur-specialite',entiteKey: 'parcours' },
    { login: 'resp.form.info', nom: 'Info',       prenom: 'Formation',  roleId: 'responsable-formation',entiteKey: 'parcours' },
    { login: 'resp.annee.l2',  nom: 'L2',         prenom: 'Annee',      roleId: 'responsable-annee',   entiteKey: 'niveau' },
    { login: 'ens.dupont',     nom: 'Dupont',     prenom: 'Enseignant', roleId: 'utilisateur-simple',  entiteKey: 'departement' },
    { login: 'viewer.readonly',nom: 'Viewer',     prenom: 'Readonly',   roleId: 'lecture-seule',       entiteKey: 'departement' },
  ];

  const affectationIdsByLogin = new Map<string, bigint>();

  for (const user of users) {
    const created = await prisma.utilisateur.upsert({
      where: { login: user.login },
      update: {},
      create: {
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        statut: utilisateur_statut.ACTIF,
        email_institutionnel: `${user.login}@univ-paris13.fr`,
      },
    });

    const entiteId = entites[user.entiteKey];
    const existing = await prisma.affectation.findFirst({
      where: { id_user: created.id_user, id_role: user.roleId, id_entite: entiteId, id_annee: annee.id_annee },
    });
    const affectation =
      existing ??
      (await prisma.affectation.create({
        data: {
          id_user: created.id_user,
          id_role: user.roleId,
          id_entite: entiteId,
          id_annee: annee.id_annee,
          date_debut: new Date('2025-09-01'),
          date_fin: null,
        },
      }));

    affectationIdsByLogin.set(user.login, affectation.id_affectation);
  }

  for (const [login, supervisorLogin] of Object.entries(DEMO_SUPERVISOR_BY_LOGIN)) {
    const affectationId = affectationIdsByLogin.get(login);
    const supervisorId = supervisorLogin
      ? affectationIdsByLogin.get(supervisorLogin)
      : null;

    if (!affectationId || !supervisorId) {
      continue;
    }

    await prisma.affectation.update({
      where: { id_affectation: affectationId },
      data: { id_affectation_n_plus_1: supervisorId },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    'Seed terminé : 39 types de diplômes, rôles Sprint 4, année 2025-2026, ' +
    'Institut Galilée (903) + Licences + Masters Droit + Masters Science Po, utilisateurs de démo.',
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
