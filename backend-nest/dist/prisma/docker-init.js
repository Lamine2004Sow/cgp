"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}
const MAX_ATTEMPTS = Number(process.env.DOCKER_INIT_MAX_ATTEMPTS ?? 20);
const RETRY_DELAY_MS = Number(process.env.DOCKER_INIT_RETRY_DELAY_MS ?? 3000);
function run(command) {
    console.log(`[docker-init] ${command}`);
    (0, node_child_process_1.execSync)(command, { stdio: 'inherit' });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function applySchemaWithRetry() {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            run('npx prisma db push');
            return;
        }
        catch (error) {
            lastError = error;
            if (attempt === MAX_ATTEMPTS) {
                break;
            }
            console.warn(`[docker-init] prisma db push failed (attempt ${attempt}/${MAX_ATTEMPTS}), retry in ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('Failed to apply Prisma schema.');
}
async function shouldSeed() {
    const prisma = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: databaseUrl }),
    });
    try {
        const [entityCount, userCount] = await Promise.all([
            prisma.entite_structure.count(),
            prisma.utilisateur.count(),
        ]);
        if (entityCount > 0 || userCount > 0) {
            console.log(`[docker-init] Skip seed: existing data detected (entite_structure=${entityCount}, utilisateur=${userCount}).`);
            return false;
        }
        return true;
    }
    finally {
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
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=docker-init.js.map