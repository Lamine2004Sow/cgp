"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString: databaseUrl }),
});
const ROLES = [
    { id: 'services-centraux', libelle: 'Services centraux', niveau: 0, isGlobal: true },
    { id: 'administrateur', libelle: 'Administrateur', niveau: 1, isGlobal: true },
    { id: 'directeur-composante', libelle: 'Directeur de composante', niveau: 10, isGlobal: false },
    { id: 'directeur-administratif', libelle: 'Directeur administratif', niveau: 11, isGlobal: false },
    { id: 'directeur-administratif-adjoint', libelle: 'DA adjoint', niveau: 12, isGlobal: false },
    { id: 'directeur-departement', libelle: 'Directeur de département', niveau: 20, isGlobal: false },
    { id: 'directeur-mention', libelle: 'Directeur de mention', niveau: 30, isGlobal: false },
    { id: 'directeur-specialite', libelle: 'Directeur de spécialité', niveau: 40, isGlobal: false },
    { id: 'responsable-formation', libelle: 'Responsable de formation', niveau: 50, isGlobal: false },
    { id: 'responsable-annee', libelle: "Responsable d'année", niveau: 60, isGlobal: false },
    { id: 'utilisateur-simple', libelle: 'Utilisateur simple', niveau: 90, isGlobal: false },
    { id: 'lecture-seule', libelle: 'Lecture seule', niveau: 99, isGlobal: true },
];
function parseCsvLine(line) {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        const next = line[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (c === ',' && !inQuotes) {
            out.push(current);
            current = '';
            continue;
        }
        current += c;
    }
    out.push(current);
    return out;
}
function normalizeText(value) {
    return (value ?? '').trim().replace(/\s+/g, ' ');
}
function normalizeForKey(value) {
    return normalizeText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
function sanitizeCsvValue(value) {
    const cleaned = normalizeText(value);
    if (!cleaned) {
        return '';
    }
    if (cleaned.toLowerCase() === 'null') {
        return '';
    }
    return cleaned;
}
function slug(value) {
    return sanitizeCsvValue(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'user';
}
function readCsv(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        return [];
    }
    const headers = parseCsvLine(lines[0]).map((header) => normalizeForKey(header));
    return lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = sanitizeCsvValue(cols[index] ?? '');
        });
        return row;
    });
}
function pick(row, keys) {
    for (const key of keys) {
        const value = row[normalizeForKey(key)];
        if (value) {
            return value;
        }
    }
    return '';
}
function toStructureRow(row) {
    return {
        composante: pick(row, ['composante']),
        departement: pick(row, ['departement']),
        diplomeType: pick(row, ['diplome_type', 'type_diplome']),
        mention: pick(row, ['mention']),
        parcours: pick(row, ['parcours']),
        formationNom: pick(row, ['formation_nom', 'formation']),
    };
}
function toContactRow(row) {
    const nomComplet = pick(row, ['nom_complet']) ||
        normalizeText(`${pick(row, ['responsable_prenom'])} ${pick(row, ['responsable_nom'])}`);
    return {
        nomComplet,
        roleExact: pick(row, ['role_exact', 'role']),
        perimetreRole: pick(row, ['perimetre_role', 'perimetre']),
        email: pick(row, ['email', 'email_institutionnel']),
        telephone: pick(row, ['telephone']),
        bureau: pick(row, ['bureau']),
        service: pick(row, ['service']),
        composante: pick(row, ['composante']),
        departement: pick(row, ['departement']),
        mention: pick(row, ['mention']),
        parcours: pick(row, ['parcours']),
        formationNom: pick(row, ['formation_nom', 'formation']),
    };
}
function resolveCsvDir() {
    const candidates = [
        process.env.CSV_DIR,
        path.join(process.cwd(), '..', 'files', 'csv'),
        path.join(process.cwd(), 'files', 'csv'),
        '/app/files/csv',
        path.join(process.cwd(), '..', 'csv'),
        path.join(process.cwd(), 'csv'),
        '/app/csv',
    ].filter(Boolean);
    const requiredFiles = ['structures.csv', 'responsables.csv', 'secretariat.csv'];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) &&
            requiredFiles.every((file) => fs.existsSync(path.join(candidate, file)))) {
            return candidate;
        }
    }
    throw new Error(`Dossier CSV introuvable. Chemins testés: ${candidates.join(', ')}`);
}
function getDefaultYearValues() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startYear = currentMonth >= 9 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    return {
        libelle: `${startYear}-${endYear}`,
        dateDebut: new Date(`${startYear}-09-01`),
        dateFin: new Date(`${endYear}-08-31`),
    };
}
function composanteKey(composante) {
    return normalizeForKey(composante);
}
function departementKey(composante, departement) {
    return `${composanteKey(composante)}|${normalizeForKey(departement)}`;
}
function mentionKey(composante, departement, mention) {
    return `${composanteKey(composante)}|${normalizeForKey(departement)}|${normalizeForKey(mention)}`;
}
function parcoursKey(composante, departement, mention, parcours) {
    return `${composanteKey(composante)}|${normalizeForKey(departement)}|${normalizeForKey(mention)}|${normalizeForKey(parcours)}`;
}
function formationKey(composante, departement, mention, parcours, formation) {
    return `${composanteKey(composante)}|${normalizeForKey(departement)}|${normalizeForKey(mention)}|${normalizeForKey(parcours)}|${normalizeForKey(formation)}`;
}
function mapRole(roleExact, perimetreRole) {
    const role = normalizeForKey(roleExact);
    const perimetre = normalizeForKey(perimetreRole);
    if (!role) {
        return 'utilisateur-simple';
    }
    if (role.includes('doyen'))
        return 'directeur-composante';
    if (role.includes('directeur administratif adjoint') || role.includes('da adjoint')) {
        return 'directeur-administratif-adjoint';
    }
    if (role.includes('directeur administratif') || role.includes('directrice administrative')) {
        return 'directeur-administratif';
    }
    if (role.includes('directeur') && perimetre.includes('composante')) {
        return 'directeur-composante';
    }
    if (role.includes('chef du departement') ||
        role.includes('cheffe du departement') ||
        (role.includes('directeur') && perimetre.includes('departement')) ||
        (role.includes('responsable') && perimetre.includes('departement'))) {
        return 'directeur-departement';
    }
    if ((role.includes('directeur') || role.includes('responsable')) && perimetre.includes('mention')) {
        return 'directeur-mention';
    }
    if ((role.includes('directeur') || role.includes('responsable')) &&
        (perimetre.includes('parcours') || role.includes('parcours'))) {
        return 'directeur-specialite';
    }
    if (role.includes('responsable d annee') ||
        role.includes('responsable annee')) {
        return 'responsable-annee';
    }
    if (role.includes('responsable') &&
        (perimetre.includes('formation') || role.includes('formation'))) {
        return 'responsable-formation';
    }
    if (role.includes('secretariat') ||
        role.includes('secretaire') ||
        role.includes('scolarite') ||
        role.includes('gestionnaire') ||
        role.includes('contact')) {
        return 'utilisateur-simple';
    }
    return 'utilisateur-simple';
}
function splitFullName(fullName, email) {
    const cleanedFullName = sanitizeCsvValue(fullName);
    if (cleanedFullName) {
        const chunks = cleanedFullName.split(' ').filter(Boolean);
        if (chunks.length === 1) {
            return { nom: chunks[0], prenom: 'Contact' };
        }
        return {
            nom: chunks[chunks.length - 1],
            prenom: chunks.slice(0, -1).join(' '),
        };
    }
    const localPart = sanitizeCsvValue(email).split('@')[0] || '';
    const fromEmail = localPart
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean);
    if (fromEmail.length >= 2) {
        return {
            nom: fromEmail[fromEmail.length - 1],
            prenom: fromEmail.slice(0, -1).join(' '),
        };
    }
    if (fromEmail.length === 1) {
        return {
            nom: fromEmail[0],
            prenom: 'Contact',
        };
    }
    return {
        nom: 'Contact',
        prenom: 'Contact',
    };
}
async function main() {
    const csvDir = resolveCsvDir();
    const composantesPath = path.join(csvDir, 'composantes.csv');
    const structuresPath = path.join(csvDir, 'structures.csv');
    const responsablesPath = path.join(csvDir, 'responsables.csv');
    const secretariatPath = path.join(csvDir, 'secretariat.csv');
    const composantesRaw = fs.existsSync(composantesPath)
        ? readCsv(composantesPath)
        : [];
    const structuresRaw = readCsv(structuresPath);
    const responsablesRaw = readCsv(responsablesPath);
    const secretariatRaw = readCsv(secretariatPath);
    const structureRows = structuresRaw.map(toStructureRow);
    const contactRows = [...responsablesRaw, ...secretariatRaw].map(toContactRow);
    for (const role of ROLES) {
        await prisma.role.upsert({
            where: { id_role: role.id },
            update: {
                libelle: role.libelle,
                niveau_hierarchique: role.niveau,
                is_global: role.isGlobal,
            },
            create: {
                id_role: role.id,
                libelle: role.libelle,
                niveau_hierarchique: role.niveau,
                is_global: role.isGlobal,
            },
        });
    }
    let annee = await prisma.annee_universitaire.findFirst({
        where: { statut: client_1.annee_statut.EN_COURS },
        orderBy: { id_annee: 'desc' },
    });
    if (!annee) {
        const defaults = getDefaultYearValues();
        annee = await prisma.annee_universitaire.create({
            data: {
                libelle: defaults.libelle,
                date_debut: defaults.dateDebut,
                date_fin: defaults.dateFin,
                statut: client_1.annee_statut.EN_COURS,
            },
        });
    }
    const idAnnee = annee.id_annee;
    const dateDebut = annee.date_debut;
    const entiteCache = new Map();
    const composanteIds = new Map();
    const departementIds = new Map();
    const mentionIds = new Map();
    const parcoursIds = new Map();
    const formationIds = new Map();
    async function getOrCreateEntite(params) {
        const cached = entiteCache.get(params.cacheKey);
        if (cached) {
            return cached;
        }
        const existing = await prisma.entite_structure.findFirst({
            where: {
                id_annee: idAnnee,
                id_entite_parent: params.parentId,
                type_entite: params.type,
                nom: params.nom,
            },
            select: {
                id_entite: true,
            },
        });
        const entite = existing ??
            (await prisma.entite_structure.create({
                data: {
                    id_annee: idAnnee,
                    id_entite_parent: params.parentId,
                    type_entite: params.type,
                    nom: params.nom,
                    tel_service: null,
                    bureau_service: null,
                },
                select: {
                    id_entite: true,
                },
            }));
        entiteCache.set(params.cacheKey, entite.id_entite);
        if (params.type === client_1.entite_type.COMPOSANTE) {
            await prisma.composante.upsert({
                where: { id_entite: entite.id_entite },
                update: {},
                create: { id_entite: entite.id_entite, site_web: null },
            });
        }
        if (params.type === client_1.entite_type.DEPARTEMENT) {
            await prisma.departement.upsert({
                where: { id_entite: entite.id_entite },
                update: {},
                create: { id_entite: entite.id_entite, code_interne: null },
            });
        }
        if (params.type === client_1.entite_type.MENTION) {
            await prisma.mention.upsert({
                where: { id_entite: entite.id_entite },
                update: params.typeDiplome ? { type_diplome: params.typeDiplome } : {},
                create: {
                    id_entite: entite.id_entite,
                    type_diplome: params.typeDiplome || null,
                },
            });
        }
        if (params.type === client_1.entite_type.PARCOURS) {
            await prisma.parcours.upsert({
                where: { id_entite: entite.id_entite },
                update: {},
                create: { id_entite: entite.id_entite, code_parcours: null },
            });
        }
        if (params.type === client_1.entite_type.NIVEAU) {
            await prisma.niveau.upsert({
                where: { id_entite: entite.id_entite },
                update: {},
                create: { id_entite: entite.id_entite, libelle_court: null },
            });
        }
        return entite.id_entite;
    }
    const hierarchyRows = [
        ...structureRows,
        ...contactRows.map((row) => ({
            composante: row.composante,
            departement: row.departement,
            diplomeType: '',
            mention: row.mention,
            parcours: row.parcours,
            formationNom: row.formationNom,
        })),
    ];
    const composanteNames = new Set();
    for (const row of composantesRaw) {
        const composante = pick(row, ['composante']);
        if (composante) {
            composanteNames.add(composante);
        }
    }
    for (const row of hierarchyRows) {
        if (row.composante) {
            composanteNames.add(row.composante);
        }
    }
    for (const composante of composanteNames) {
        const key = composanteKey(composante);
        if (!key || composanteIds.has(key)) {
            continue;
        }
        const idEntite = await getOrCreateEntite({
            parentId: null,
            type: client_1.entite_type.COMPOSANTE,
            nom: composante,
            cacheKey: `root|COMPOSANTE|${key}`,
        });
        composanteIds.set(key, idEntite);
    }
    for (const row of hierarchyRows) {
        if (!row.composante || !row.departement) {
            continue;
        }
        const parentId = composanteIds.get(composanteKey(row.composante));
        if (!parentId) {
            continue;
        }
        const key = departementKey(row.composante, row.departement);
        if (departementIds.has(key)) {
            continue;
        }
        const idEntite = await getOrCreateEntite({
            parentId,
            type: client_1.entite_type.DEPARTEMENT,
            nom: row.departement,
            cacheKey: `${parentId.toString()}|DEPARTEMENT|${normalizeForKey(row.departement)}`,
        });
        departementIds.set(key, idEntite);
    }
    function getMentionId(composante, departement, mention) {
        if (!mention) {
            return undefined;
        }
        return (mentionIds.get(mentionKey(composante, departement, mention)) ??
            mentionIds.get(mentionKey(composante, '', mention)));
    }
    function getParcoursId(composante, departement, mention, parcours) {
        if (!parcours) {
            return undefined;
        }
        return (parcoursIds.get(parcoursKey(composante, departement, mention, parcours)) ??
            parcoursIds.get(parcoursKey(composante, '', mention, parcours)) ??
            parcoursIds.get(parcoursKey(composante, '', '', parcours)));
    }
    function getFormationId(composante, departement, mention, parcours, formation) {
        if (!formation) {
            return undefined;
        }
        return (formationIds.get(formationKey(composante, departement, mention, parcours, formation)) ??
            formationIds.get(formationKey(composante, departement, mention, '', formation)) ??
            formationIds.get(formationKey(composante, '', mention, '', formation)) ??
            formationIds.get(formationKey(composante, '', '', '', formation)));
    }
    for (const row of hierarchyRows) {
        if (!row.composante || !row.mention) {
            continue;
        }
        const composanteId = composanteIds.get(composanteKey(row.composante));
        if (!composanteId) {
            continue;
        }
        const parentId = (row.departement
            ? departementIds.get(departementKey(row.composante, row.departement))
            : undefined) ?? composanteId;
        const key = mentionKey(row.composante, row.departement, row.mention);
        if (mentionIds.has(key)) {
            continue;
        }
        const idEntite = await getOrCreateEntite({
            parentId,
            type: client_1.entite_type.MENTION,
            nom: row.mention,
            cacheKey: `${parentId.toString()}|MENTION|${normalizeForKey(row.mention)}`,
            typeDiplome: row.diplomeType,
        });
        mentionIds.set(key, idEntite);
        const fallbackKey = mentionKey(row.composante, '', row.mention);
        if (!mentionIds.has(fallbackKey)) {
            mentionIds.set(fallbackKey, idEntite);
        }
    }
    for (const row of hierarchyRows) {
        if (!row.composante || !row.parcours) {
            continue;
        }
        const composanteId = composanteIds.get(composanteKey(row.composante));
        if (!composanteId) {
            continue;
        }
        const mentionId = getMentionId(row.composante, row.departement, row.mention);
        const departementId = row.departement
            ? departementIds.get(departementKey(row.composante, row.departement))
            : undefined;
        const parentId = mentionId ?? departementId ?? composanteId;
        const key = parcoursKey(row.composante, row.departement, row.mention, row.parcours);
        if (parcoursIds.has(key)) {
            continue;
        }
        const idEntite = await getOrCreateEntite({
            parentId,
            type: client_1.entite_type.PARCOURS,
            nom: row.parcours,
            cacheKey: `${parentId.toString()}|PARCOURS|${normalizeForKey(row.parcours)}`,
        });
        parcoursIds.set(key, idEntite);
        const fallbackKey = parcoursKey(row.composante, '', row.mention, row.parcours);
        if (!parcoursIds.has(fallbackKey)) {
            parcoursIds.set(fallbackKey, idEntite);
        }
        const broadFallbackKey = parcoursKey(row.composante, '', '', row.parcours);
        if (!parcoursIds.has(broadFallbackKey)) {
            parcoursIds.set(broadFallbackKey, idEntite);
        }
    }
    for (const row of hierarchyRows) {
        if (!row.composante || !row.formationNom) {
            continue;
        }
        const composanteId = composanteIds.get(composanteKey(row.composante));
        if (!composanteId) {
            continue;
        }
        const parcoursId = getParcoursId(row.composante, row.departement, row.mention, row.parcours);
        const mentionId = getMentionId(row.composante, row.departement, row.mention);
        const departementId = row.departement
            ? departementIds.get(departementKey(row.composante, row.departement))
            : undefined;
        const parentId = parcoursId ?? mentionId ?? departementId ?? composanteId;
        const key = formationKey(row.composante, row.departement, row.mention, row.parcours, row.formationNom);
        if (formationIds.has(key)) {
            continue;
        }
        const idEntite = await getOrCreateEntite({
            parentId,
            type: client_1.entite_type.NIVEAU,
            nom: row.formationNom,
            cacheKey: `${parentId.toString()}|NIVEAU|${normalizeForKey(row.formationNom)}`,
        });
        formationIds.set(key, idEntite);
        const fallbackKey = formationKey(row.composante, row.departement, row.mention, '', row.formationNom);
        if (!formationIds.has(fallbackKey)) {
            formationIds.set(fallbackKey, idEntite);
        }
        const broadFallbackKey = formationKey(row.composante, '', '', '', row.formationNom);
        if (!formationIds.has(broadFallbackKey)) {
            formationIds.set(broadFallbackKey, idEntite);
        }
    }
    function resolveEntite(row) {
        const composanteId = composanteIds.get(composanteKey(row.composante));
        if (!composanteId) {
            return null;
        }
        const departementId = row.departement
            ? departementIds.get(departementKey(row.composante, row.departement))
            : undefined;
        const mentionId = getMentionId(row.composante, row.departement, row.mention);
        const parcoursId = getParcoursId(row.composante, row.departement, row.mention, row.parcours);
        const formationId = getFormationId(row.composante, row.departement, row.mention, row.parcours, row.formationNom);
        const perimetre = normalizeForKey(row.perimetreRole);
        if (perimetre.includes('composante'))
            return composanteId;
        if (perimetre.includes('departement') && departementId)
            return departementId;
        if (perimetre.includes('mention') && mentionId)
            return mentionId;
        if (perimetre.includes('parcours') && parcoursId)
            return parcoursId;
        if (perimetre.includes('formation') && formationId)
            return formationId;
        return formationId ?? parcoursId ?? mentionId ?? departementId ?? composanteId;
    }
    const existingLoginRows = await prisma.utilisateur.findMany({
        select: { login: true },
    });
    const knownLogins = new Set(existingLoginRows.map((row) => row.login));
    async function resolveUniqueLogin(baseLogin) {
        let candidate = slug(baseLogin).slice(0, 60) || 'contact';
        let suffix = 0;
        while (knownLogins.has(candidate)) {
            suffix += 1;
            const suffixText = `-${suffix}`;
            candidate = `${slug(baseLogin).slice(0, Math.max(1, 60 - suffixText.length))}${suffixText}`;
        }
        const alreadyInDb = await prisma.utilisateur.findUnique({
            where: { login: candidate },
            select: { id_user: true },
        });
        if (alreadyInDb) {
            return resolveUniqueLogin(`${baseLogin}-${suffix + 1}`);
        }
        knownLogins.add(candidate);
        return candidate;
    }
    const userByKey = new Map();
    for (const row of contactRows) {
        if (!row.nomComplet &&
            !row.email &&
            !row.telephone &&
            !row.bureau &&
            !row.service) {
            continue;
        }
        const email = row.email ? row.email.toLowerCase() : '';
        const { nom, prenom } = splitFullName(row.nomComplet, email);
        const userKey = email ||
            `${normalizeForKey(nom)}|${normalizeForKey(prenom)}|${normalizeForKey(row.service)}`;
        let idUser = userByKey.get(userKey);
        if (idUser === undefined) {
            const existingUser = email
                ? await prisma.utilisateur.findFirst({
                    where: {
                        email_institutionnel: {
                            equals: email,
                            mode: 'insensitive',
                        },
                    },
                    select: {
                        id_user: true,
                        telephone: true,
                        bureau: true,
                        email_institutionnel: true,
                    },
                })
                : await prisma.utilisateur.findFirst({
                    where: {
                        nom,
                        prenom,
                    },
                    select: {
                        id_user: true,
                        telephone: true,
                        bureau: true,
                        email_institutionnel: true,
                    },
                });
            if (existingUser) {
                idUser = existingUser.id_user;
                const shouldUpdate = (!existingUser.telephone && row.telephone) ||
                    (!existingUser.bureau && row.bureau) ||
                    (!existingUser.email_institutionnel && email);
                if (shouldUpdate) {
                    await prisma.utilisateur.update({
                        where: { id_user: idUser },
                        data: {
                            ...(row.telephone && !existingUser.telephone
                                ? { telephone: row.telephone }
                                : {}),
                            ...(row.bureau && !existingUser.bureau ? { bureau: row.bureau } : {}),
                            ...(email && !existingUser.email_institutionnel
                                ? { email_institutionnel: email }
                                : {}),
                        },
                    });
                }
            }
            else {
                const loginBase = (email ? email.split('@')[0] : '') ||
                    `${slug(prenom)}.${slug(nom)}` ||
                    slug(row.service || row.formationNom || 'contact');
                const login = await resolveUniqueLogin(loginBase);
                const created = await prisma.utilisateur.create({
                    data: {
                        login,
                        nom: nom || 'Contact',
                        prenom: prenom || 'Contact',
                        email_institutionnel: email || null,
                        telephone: row.telephone || null,
                        bureau: row.bureau || null,
                        statut: client_1.utilisateur_statut.ACTIF,
                    },
                    select: {
                        id_user: true,
                    },
                });
                idUser = created.id_user;
            }
            userByKey.set(userKey, idUser);
        }
        if (!idUser) {
            continue;
        }
        const idEntite = resolveEntite(row);
        if (!idEntite) {
            continue;
        }
        const idRole = mapRole(row.roleExact, row.perimetreRole);
        const existingAffectation = await prisma.affectation.findFirst({
            where: {
                id_user: idUser,
                id_role: idRole,
                id_entite: idEntite,
                id_annee: idAnnee,
            },
            select: {
                id_affectation: true,
            },
        });
        if (!existingAffectation) {
            await prisma.affectation.create({
                data: {
                    id_user: idUser,
                    id_role: idRole,
                    id_entite: idEntite,
                    id_annee: idAnnee,
                    date_debut: dateDebut,
                    date_fin: null,
                },
            });
        }
    }
    const firstComposanteId = composanteIds.values().next().value;
    const firstDepartementId = departementIds.values().next().value;
    const firstMentionId = mentionIds.values().next().value;
    const firstParcoursId = parcoursIds.values().next().value;
    const firstFormationId = formationIds.values().next().value;
    const fallbackEntiteId = firstComposanteId ??
        firstDepartementId ??
        firstMentionId ??
        firstParcoursId ??
        firstFormationId;
    const demoUsers = [
        {
            login: 'sc.admin',
            nom: 'Admin',
            prenom: 'Services',
            roleId: 'services-centraux',
            entiteId: firstComposanteId,
        },
        {
            login: 'dsi.tech',
            nom: 'Tech',
            prenom: 'DSI',
            roleId: 'administrateur',
            entiteId: firstComposanteId,
        },
        {
            login: 'dc.infocom',
            nom: 'Infocom',
            prenom: 'Directeur',
            roleId: 'directeur-composante',
            entiteId: firstComposanteId,
        },
        {
            login: 'da.infocom',
            nom: 'Infocom',
            prenom: 'DA',
            roleId: 'directeur-administratif',
            entiteId: firstComposanteId,
        },
        {
            login: 'dir.dept.info',
            nom: 'Info',
            prenom: 'Departement',
            roleId: 'directeur-departement',
            entiteId: firstDepartementId,
        },
        {
            login: 'dir.mention.l3',
            nom: 'L3',
            prenom: 'Mention',
            roleId: 'directeur-mention',
            entiteId: firstMentionId,
        },
        {
            login: 'dir.spec.ia',
            nom: 'IA',
            prenom: 'Specialite',
            roleId: 'directeur-specialite',
            entiteId: firstParcoursId,
        },
        {
            login: 'resp.form.info',
            nom: 'Info',
            prenom: 'Formation',
            roleId: 'responsable-formation',
            entiteId: firstParcoursId ?? firstFormationId,
        },
        {
            login: 'resp.annee.l2',
            nom: 'L2',
            prenom: 'Annee',
            roleId: 'responsable-annee',
            entiteId: firstFormationId ?? firstParcoursId,
        },
        {
            login: 'ens.dupont',
            nom: 'Dupont',
            prenom: 'Enseignant',
            roleId: 'utilisateur-simple',
            entiteId: firstDepartementId,
        },
        {
            login: 'viewer.readonly',
            nom: 'Viewer',
            prenom: 'Readonly',
            roleId: 'lecture-seule',
            entiteId: firstDepartementId,
        },
    ];
    for (const demo of demoUsers) {
        const entiteId = demo.entiteId ?? fallbackEntiteId;
        if (!entiteId) {
            continue;
        }
        let user = await prisma.utilisateur.findUnique({
            where: { login: demo.login },
            select: { id_user: true },
        });
        if (!user) {
            user = await prisma.utilisateur.create({
                data: {
                    login: demo.login,
                    nom: demo.nom,
                    prenom: demo.prenom,
                    email_institutionnel: null,
                    statut: client_1.utilisateur_statut.ACTIF,
                },
                select: {
                    id_user: true,
                },
            });
        }
        const existingAffectation = await prisma.affectation.findFirst({
            where: {
                id_user: user.id_user,
                id_role: demo.roleId,
                id_entite: entiteId,
                id_annee: idAnnee,
            },
            select: { id_affectation: true },
        });
        if (!existingAffectation) {
            await prisma.affectation.create({
                data: {
                    id_user: user.id_user,
                    id_role: demo.roleId,
                    id_entite: entiteId,
                    id_annee: idAnnee,
                    date_debut: dateDebut,
                    date_fin: null,
                },
            });
        }
    }
    console.log(`Seed CSV termine: ${composanteIds.size} composantes, ${departementIds.size} departements, ${mentionIds.size} mentions, ${parcoursIds.size} parcours, ${formationIds.size} formations, ${userByKey.size} contacts importes.`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-from-csv.js.map