/**
 * Script pour décharger (vider) la base de données.
 * À lancer avant un nouveau remplissage (seed).
 *
 * Usage: npx ts-node --transpile-only prisma/reset-db.ts
 *    ou: npm run db:reset
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not définie');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  // Ordre : tables sans dépendances d'abord, puis parents.
  // CASCADE vide aussi les tables qui ont une FK vers la table tronquée.
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
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );
  // eslint-disable-next-line no-console
  console.log('Base déchargée (toutes les tables vidées).');
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
