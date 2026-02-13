"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString: databaseUrl }),
});
async function ensureRole(params) {
    await prisma.role.upsert({
        where: { id_role: params.id },
        update: {},
        create: {
            id_role: params.id,
            libelle: params.libelle,
            description: params.description,
            niveau_hierarchique: params.niveau,
            is_global: params.isGlobal,
        },
    });
}
async function ensureUser(user, anneeId) {
    const created = await prisma.utilisateur.upsert({
        where: { login: user.login },
        update: {},
        create: {
            login: user.login,
            nom: user.nom,
            prenom: user.prenom,
            statut: client_1.utilisateur_statut.ACTIF,
            email_institutionnel: `${user.login}@example.test`,
        },
    });
    const existingAffectation = await prisma.affectation.findFirst({
        where: {
            id_user: created.id_user,
            id_role: user.roleId,
            id_entite: user.entiteId,
            id_annee: anneeId,
        },
    });
    if (!existingAffectation) {
        await prisma.affectation.create({
            data: {
                id_user: created.id_user,
                id_role: user.roleId,
                id_entite: user.entiteId,
                id_annee: anneeId,
                date_debut: new Date('2024-09-01'),
                date_fin: null,
            },
        });
    }
}
async function main() {
    const year = await prisma.annee_universitaire.findFirst({
        where: { statut: 'EN_COURS' },
        orderBy: { id_annee: 'desc' },
    });
    if (!year) {
        throw new Error('No active academic year found to seed mock users.');
    }
    await ensureRole({
        id: 'lecture-seule',
        libelle: 'Lecture seule',
        description: 'Lecture seule',
        niveau: 99,
        isGlobal: true,
    });
    const entites = {
        composante: BigInt(100),
        departement: BigInt(110),
        mention: BigInt(120),
        parcours: BigInt(130),
        niveau: BigInt(140),
    };
    const users = [
        { login: 'sc.admin', nom: 'Admin', prenom: 'Services', roleId: 'services-centraux', entiteId: entites.composante },
        { login: 'dsi.tech', nom: 'Tech', prenom: 'DSI', roleId: 'administrateur', entiteId: entites.composante },
        { login: 'dc.infocom', nom: 'Infocom', prenom: 'Directeur', roleId: 'directeur-composante', entiteId: entites.composante },
        { login: 'da.infocom', nom: 'Infocom', prenom: 'DA', roleId: 'directeur-administratif', entiteId: entites.composante },
        { login: 'dir.dept.info', nom: 'Info', prenom: 'Departement', roleId: 'directeur-departement', entiteId: entites.departement },
        { login: 'dir.mention.l3', nom: 'L3', prenom: 'Mention', roleId: 'directeur-mention', entiteId: entites.mention },
        { login: 'dir.spec.ia', nom: 'IA', prenom: 'Specialite', roleId: 'directeur-specialite', entiteId: entites.parcours },
        { login: 'resp.form.info', nom: 'Info', prenom: 'Formation', roleId: 'responsable-formation', entiteId: entites.parcours },
        { login: 'resp.annee.l2', nom: 'L2', prenom: 'Annee', roleId: 'responsable-annee', entiteId: entites.niveau },
        { login: 'ens.dupont', nom: 'Dupont', prenom: 'Enseignant', roleId: 'utilisateur-simple', entiteId: entites.departement },
        { login: 'viewer.readonly', nom: 'Viewer', prenom: 'Readonly', roleId: 'lecture-seule', entiteId: entites.departement },
    ];
    for (const user of users) {
        await ensureUser(user, year.id_annee);
    }
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map