"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not définie');
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString: databaseUrl }),
});
async function main() {
    const tables = [
        'notification',
        'contact_role',
        'affectation',
        'delegation',
        'signalement',
        'organigramme',
        'journal_audit',
        'demande_modification',
        'demande_role',
        'composante',
        'departement',
        'mention',
        'parcours',
        'niveau',
        'entite_structure',
        'annee_universitaire',
        'utilisateur',
        'role',
    ];
    const quoted = tables.map((t) => `"${t}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    console.log('Base déchargée (toutes les tables vidées).');
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=reset-db.js.map