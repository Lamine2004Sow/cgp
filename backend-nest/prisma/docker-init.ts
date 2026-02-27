import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const MAX_ATTEMPTS = Number(process.env.DOCKER_INIT_MAX_ATTEMPTS ?? 20);
const RETRY_DELAY_MS = Number(process.env.DOCKER_INIT_RETRY_DELAY_MS ?? 3000);

function run(command: string) {
  // eslint-disable-next-line no-console
  console.log(`[docker-init] ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applySchemaWithRetry() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      run('npx prisma db push');
      return;
    } catch (error) {
      lastError = error;

      if (attempt === MAX_ATTEMPTS) {
        break;
      }

      // eslint-disable-next-line no-console
      console.warn(
        `[docker-init] prisma db push failed (attempt ${attempt}/${MAX_ATTEMPTS}), retry in ${RETRY_DELAY_MS}ms...`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to apply Prisma schema.');
}

async function shouldSeed(): Promise<boolean> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const [entityCount, userCount] = await Promise.all([
      prisma.entite_structure.count(),
      prisma.utilisateur.count(),
    ]);

    if (entityCount > 0 || userCount > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[docker-init] Skip seed: existing data detected (entite_structure=${entityCount}, utilisateur=${userCount}).`,
      );
      return false;
    }

    return true;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await applySchemaWithRetry();

  if (!(await shouldSeed())) {
    return;
  }

  run('npx ts-node --transpile-only prisma/seed-from-csv.ts');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
