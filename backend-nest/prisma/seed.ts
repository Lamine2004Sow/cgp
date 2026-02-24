import {
  PrismaClient,
  entite_type,
  utilisateur_statut,
  annee_statut,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

/** Rôles de référence (alignés sur files / usage app) */
const ROLES: Array<{
  id: string;
  libelle: string;
  description?: string;
  niveau: number;
  isGlobal: boolean;
}> = [
  { id: 'services-centraux', libelle: 'Services centraux', niveau: 0, isGlobal: true },
  { id: 'administrateur', libelle: 'Administrateur', niveau: 1, isGlobal: true },
  { id: 'directeur-composante', libelle: 'Directeur de composante', niveau: 10, isGlobal: false },
  { id: 'directeur-administratif', libelle: 'Directeur administratif', niveau: 11, isGlobal: false },
  { id: 'directeur-administratif-adjoint', libelle: 'Directeur administratif adjoint', niveau: 12, isGlobal: false },
  { id: 'directeur-departement', libelle: 'Directeur de département', niveau: 20, isGlobal: false },
  { id: 'directeur-mention', libelle: 'Directeur de mention', niveau: 30, isGlobal: false },
  { id: 'directeur-specialite', libelle: 'Directeur de spécialité', niveau: 40, isGlobal: false },
  { id: 'responsable-formation', libelle: 'Responsable de formation', niveau: 50, isGlobal: false },
  { id: 'responsable-annee', libelle: 'Responsable d\'année', niveau: 60, isGlobal: false },
  { id: 'utilisateur-simple', libelle: 'Utilisateur simple', niveau: 90, isGlobal: false },
  { id: 'lecture-seule', libelle: 'Lecture seule', description: 'Lecture seule', niveau: 99, isGlobal: true },
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

async function ensureRole(params: {
  id: string;
  libelle: string;
  description?: string;
  niveau: number;
  isGlobal: boolean;
  id_composante?: bigint | null;
}): Promise<void> {
  await prisma.role.upsert({
    where: { id_role: params.id },
    update: {},
    create: {
      id_role: params.id,
      libelle: params.libelle,
      description: params.description ?? null,
      niveau_hierarchique: params.niveau,
      is_global: params.isGlobal,
      id_composante: params.id_composante ?? null,
    },
  });
}

async function main() {
  // ----- 1. Rôles -----
  for (const r of ROLES) {
    await ensureRole({
      id: r.id,
      libelle: r.libelle,
      description: r.description,
      niveau: r.niveau,
      isGlobal: r.isGlobal,
    });
  }

  // ----- 2. Année universitaire (référence files: organigrammes Licences 25-30, Droit, Science Po) -----
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

  // ----- 3. Structure basée sur files/assets (ORGANIGRAMME Licences, Droit, Science Politique 25-30) -----
  const existingLicences = await prisma.entite_structure.findFirst({
    where: {
      id_annee: annee.id_annee,
      type_entite: entite_type.COMPOSANTE,
      nom: 'Licences 2025-2030',
    },
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
    const comp = existingLicences;
    firstComposante = comp.id_entite;
    firstDepartement = byParent.get(comp.id_entite.toString())![0].id_entite;
    firstMention = byParent.get(firstDepartement.toString())![0].id_entite;
    firstParcours = byParent.get(firstMention.toString())![0].id_entite;
    firstNiveau = byParent.get(firstParcours.toString())![0].id_entite;
  } else {
    // --- 3.1 Licences 2025-2030 (cycle 1) — ORGANIGRAMME Licences 25-30.pdf ---
    const compLicences = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: null,
        type_entite: entite_type.COMPOSANTE,
        nom: 'Licences 2025-2030',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.composante.create({
      data: { id_entite: compLicences.id_entite, site_web: null },
    });
    firstComposante = compLicences.id_entite;

    const deptLicences = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: compLicences.id_entite,
        type_entite: entite_type.DEPARTEMENT,
        nom: 'Formations licence',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.departement.create({
      data: { id_entite: deptLicences.id_entite, code_interne: null },
    });
    firstDepartement = deptLicences.id_entite;

    const mentionsLicences = [
      { nom: 'Licence Mention Droit', type_diplome: 'Licence' },
      { nom: 'Licence Mention Science politique', type_diplome: 'Licence' },
      { nom: 'Licence Mention AES', type_diplome: 'Licence' },
    ];
    let firstMentionId: bigint | null = null;
    let firstParcoursId: bigint | null = null;
    let firstNiveauId: bigint | null = null;
    for (const m of mentionsLicences) {
      const mentionE = await prisma.entite_structure.create({
        data: {
          id_annee: annee.id_annee,
          id_entite_parent: deptLicences.id_entite,
          type_entite: entite_type.MENTION,
          nom: m.nom,
          tel_service: null,
          bureau_service: null,
        },
      });
      await prisma.mention.create({
        data: { id_entite: mentionE.id_entite, type_diplome: m.type_diplome },
      });
      if (firstMentionId === null) firstMentionId = mentionE.id_entite;

      const parcoursE = await prisma.entite_structure.create({
        data: {
          id_annee: annee.id_annee,
          id_entite_parent: mentionE.id_entite,
          type_entite: entite_type.PARCOURS,
          nom: m.nom.replace('Licence Mention ', 'Licence '),
          tel_service: null,
          bureau_service: null,
        },
      });
      await prisma.parcours.create({
        data: { id_entite: parcoursE.id_entite, code_parcours: null },
      });
      if (firstParcoursId === null) firstParcoursId = parcoursE.id_entite;

      for (const libNiveau of ['L1', 'L2', 'L3']) {
        const niveauE = await prisma.entite_structure.create({
          data: {
            id_annee: annee.id_annee,
            id_entite_parent: parcoursE.id_entite,
            type_entite: entite_type.NIVEAU,
            nom: libNiveau,
            tel_service: null,
            bureau_service: null,
          },
        });
        await prisma.niveau.create({
          data: { id_entite: niveauE.id_entite, libelle_court: libNiveau },
        });
        if (firstNiveauId === null) firstNiveauId = niveauE.id_entite;
      }
    }
    firstMention = firstMentionId!;
    firstParcours = firstParcoursId!;
    firstNiveau = firstNiveauId!;
  }

  // --- 3.2 Masters Droit 2025-2030 (cycle 2) — ORGANIGRAMME Mention Droit 25-30.pdf ---
  const existingMastersDroit = await prisma.entite_structure.findFirst({
    where: {
      id_annee: annee.id_annee,
      type_entite: entite_type.COMPOSANTE,
      nom: 'Masters Droit 2025-2030',
    },
  });
  if (!existingMastersDroit) {
    const compDroit = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: null,
        type_entite: entite_type.COMPOSANTE,
        nom: 'Masters Droit 2025-2030',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.composante.create({
      data: { id_entite: compDroit.id_entite, site_web: null },
    });
    const deptDroit = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: compDroit.id_entite,
        type_entite: entite_type.DEPARTEMENT,
        nom: 'Droit',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.departement.create({
      data: { id_entite: deptDroit.id_entite, code_interne: null },
    });
    for (const m of [
      { nom: 'Mention Droit', parcours: ['M1 Droit des affaires', 'M1 Droit Notarial', 'M1 Droit Public interne et européen et International', 'M1 Droit social et relations sociales', 'M1 Droit Privé général', 'M2 Contentieux', 'M2 Droit des Activités numériques', 'M2 Droit immobilier', 'M2 Droit fiscal européen et international'] },
      { nom: 'Mention Droit Notarial', parcours: ['M1 Droit Notarial', 'M2 Droit Notarial'] },
    ]) {
      const mentionE = await prisma.entite_structure.create({
        data: {
          id_annee: annee.id_annee,
          id_entite_parent: deptDroit.id_entite,
          type_entite: entite_type.MENTION,
          nom: m.nom,
          tel_service: null,
          bureau_service: null,
        },
      });
      await prisma.mention.create({
        data: { id_entite: mentionE.id_entite, type_diplome: 'Master' },
      });
      for (const nomP of m.parcours) {
        const parcoursE = await prisma.entite_structure.create({
          data: {
            id_annee: annee.id_annee,
            id_entite_parent: mentionE.id_entite,
            type_entite: entite_type.PARCOURS,
            nom: nomP,
            tel_service: null,
            bureau_service: null,
          },
        });
        await prisma.parcours.create({
          data: { id_entite: parcoursE.id_entite, code_parcours: null },
        });
        const niveauE = await prisma.entite_structure.create({
          data: {
            id_annee: annee.id_annee,
            id_entite_parent: parcoursE.id_entite,
            type_entite: entite_type.NIVEAU,
            nom: nomP.startsWith('M1') ? 'M1' : 'M2',
            tel_service: null,
            bureau_service: null,
          },
        });
        await prisma.niveau.create({
          data: { id_entite: niveauE.id_entite, libelle_court: nomP.startsWith('M1') ? 'M1' : 'M2' },
        });
      }
    }
  }

  // --- 3.3 Masters Science Politique 2025-2030 — ORGANIGRAMME Mention Science Politique 25-30.pdf ---
  const existingMastersScPo = await prisma.entite_structure.findFirst({
    where: {
      id_annee: annee.id_annee,
      type_entite: entite_type.COMPOSANTE,
      nom: 'Masters Science Politique 2025-2030',
    },
  });
  if (!existingMastersScPo) {
    const compScPo = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: null,
        type_entite: entite_type.COMPOSANTE,
        nom: 'Masters Science Politique 2025-2030',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.composante.create({
      data: { id_entite: compScPo.id_entite, site_web: null },
    });
    const deptScPo = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: compScPo.id_entite,
        type_entite: entite_type.DEPARTEMENT,
        nom: 'Science politique',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.departement.create({
      data: { id_entite: deptScPo.id_entite, code_interne: null },
    });
    const mentionScPo = await prisma.entite_structure.create({
      data: {
        id_annee: annee.id_annee,
        id_entite_parent: deptScPo.id_entite,
        type_entite: entite_type.MENTION,
        nom: 'Mention Science Politique',
        tel_service: null,
        bureau_service: null,
      },
    });
    await prisma.mention.create({
      data: { id_entite: mentionScPo.id_entite, type_diplome: 'Master' },
    });
    const parcoursScPo = [
      'M1 Action publique et Stratégies France - International',
      'M2 Politiques publiques et territoriales',
      'M2 Études Stratégiques',
      'M2 Coopération internationale et ONG',
      'M2 Politiques commerciales avec les pays émergents',
    ];
    for (const nomP of parcoursScPo) {
      const parcoursE = await prisma.entite_structure.create({
        data: {
          id_annee: annee.id_annee,
          id_entite_parent: mentionScPo.id_entite,
          type_entite: entite_type.PARCOURS,
          nom: nomP,
          tel_service: null,
          bureau_service: null,
        },
      });
      await prisma.parcours.create({
        data: { id_entite: parcoursE.id_entite, code_parcours: null },
      });
      const libNiveau = nomP.startsWith('M1') ? 'M1' : 'M2';
      const niveauE = await prisma.entite_structure.create({
        data: {
          id_annee: annee.id_annee,
          id_entite_parent: parcoursE.id_entite,
          type_entite: entite_type.NIVEAU,
          nom: libNiveau,
          tel_service: null,
          bureau_service: null,
        },
      });
      await prisma.niveau.create({
        data: { id_entite: niveauE.id_entite, libelle_court: libNiveau },
      });
    }
  }

  const entites: EntitesIds = {
    composante: firstComposante,
    departement: firstDepartement,
    mention: firstMention,
    parcours: firstParcours,
    niveau: firstNiveau,
  };

  // ----- 4. Utilisateurs de test et affectations -----
  const users: SeedUser[] = [
    { login: 'sc.admin', nom: 'Admin', prenom: 'Services', roleId: 'services-centraux', entiteKey: 'composante' },
    { login: 'dsi.tech', nom: 'Tech', prenom: 'DSI', roleId: 'administrateur', entiteKey: 'composante' },
    { login: 'dc.infocom', nom: 'Infocom', prenom: 'Directeur', roleId: 'directeur-composante', entiteKey: 'composante' },
    { login: 'da.infocom', nom: 'Infocom', prenom: 'DA', roleId: 'directeur-administratif', entiteKey: 'composante' },
    { login: 'dir.dept.info', nom: 'Info', prenom: 'Departement', roleId: 'directeur-departement', entiteKey: 'departement' },
    { login: 'dir.mention.l3', nom: 'L3', prenom: 'Mention', roleId: 'directeur-mention', entiteKey: 'mention' },
    { login: 'dir.spec.ia', nom: 'IA', prenom: 'Specialite', roleId: 'directeur-specialite', entiteKey: 'parcours' },
    { login: 'resp.form.info', nom: 'Info', prenom: 'Formation', roleId: 'responsable-formation', entiteKey: 'parcours' },
    { login: 'resp.annee.l2', nom: 'L2', prenom: 'Annee', roleId: 'responsable-annee', entiteKey: 'niveau' },
    { login: 'ens.dupont', nom: 'Dupont', prenom: 'Enseignant', roleId: 'utilisateur-simple', entiteKey: 'departement' },
    { login: 'viewer.readonly', nom: 'Viewer', prenom: 'Readonly', roleId: 'lecture-seule', entiteKey: 'departement' },
  ];

  for (const user of users) {
    const created = await prisma.utilisateur.upsert({
      where: { login: user.login },
      update: {},
      create: {
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        statut: utilisateur_statut.ACTIF,
        email_institutionnel: `${user.login}@example.test`,
      },
    });

    const entiteId = entites[user.entiteKey];
    const existing = await prisma.affectation.findFirst({
      where: {
        id_user: created.id_user,
        id_role: user.roleId,
        id_entite: entiteId,
        id_annee: annee.id_annee,
      },
    });
    if (!existing) {
      await prisma.affectation.create({
        data: {
          id_user: created.id_user,
          id_role: user.roleId,
          id_entite: entiteId,
          id_annee: annee.id_annee,
          date_debut: new Date('2025-09-01'),
          date_fin: null,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    'Seed terminé : rôles, année 2025-2026, structure (Licences / Masters Droit / Masters Science Po 25-30), utilisateurs de démo.',
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
