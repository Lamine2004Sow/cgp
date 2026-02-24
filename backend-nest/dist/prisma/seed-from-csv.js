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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
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
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        const next = line[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                cur += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (c === ',' && !inQuotes) {
            out.push(cur.trim());
            cur = '';
            continue;
        }
        cur += c;
    }
    out.push(cur.trim());
    return out;
}
function slug(s) {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'user';
}
function mapRole(roleExact, perimetre) {
    const r = (roleExact || '').toLowerCase();
    const p = (perimetre || '').toLowerCase();
    if (r.includes('doyen'))
        return 'directeur-composante';
    if (r.includes('directeur') && r.includes('administratif') && r.includes('adjoint'))
        return 'directeur-administratif-adjoint';
    if (r.includes('directrice administrative'))
        return 'directeur-administratif';
    if (r.includes('directeur administratif'))
        return 'directeur-administratif';
    if ((r.includes('directeur') || r.includes('directrice')) && p.includes('composante'))
        return 'directeur-composante';
    if ((r.includes('chef') || r.includes('cheffe')) && (r.includes('département') || r.includes('departement')))
        return 'directeur-departement';
    if (r.includes('responsable de département') && p.includes('formation'))
        return 'responsable-formation';
    if (r.includes('responsable de département'))
        return 'directeur-departement';
    if (r.includes('responsable') && r.includes('mention'))
        return 'directeur-mention';
    if (r.includes('responsable (mention)'))
        return 'directeur-mention';
    if (r.includes('responsable de parcours') || (r.includes('parcours') && r.includes('responsable')))
        return 'directeur-specialite';
    if (r.includes('contact parcours'))
        return 'directeur-specialite';
    if (r.includes('responsable') && (r.includes('formation') || r.includes('la formation') || p.includes('formation')))
        return 'responsable-formation';
    if (r.includes('responsable d') && r.includes('année'))
        return 'responsable-annee';
    if (r.includes('responsable du master'))
        return 'responsable-formation';
    return 'utilisateur-simple';
}
function resolveCsvPath() {
    const candidates = [
        process.env.CSV_PATH,
        path.join(process.cwd(), '..', 'files', 'assets', 'extrait_formations_responsables.csv'),
        path.join(process.cwd(), 'files', 'assets', 'extrait_formations_responsables.csv'),
        '/app/files/assets/extrait_formations_responsables.csv',
    ].filter(Boolean);
    for (const p of candidates) {
        if (fs.existsSync(p))
            return p;
    }
    throw new Error(`CSV introuvable. Chemins testés: ${candidates.join(', ')}. Avec Docker: monter ./files sur /app/files.`);
}
async function main() {
    const csvPath = resolveCsvPath();
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        throw new Error('CSV vide ou sans en-tête');
    }
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (name) => header.indexOf(name.toLowerCase());
    const rows = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const get = (name) => cols[idx(name)] ?? '';
        return {
            composante: get('composante'),
            departement: get('departement'),
            formation_nom: get('formation_nom'),
            diplome_type: get('diplome_type'),
            mention: get('mention'),
            parcours: get('parcours'),
            responsable_nom: get('responsable_nom'),
            responsable_prenom: get('responsable_prenom'),
            role_exact: get('role_exact'),
            perimetre_role: get('perimetre_role'),
            email: get('email'),
            telephone: get('telephone'),
            bureau: get('bureau'),
        };
    });
    for (const r of ROLES) {
        await prisma.role.upsert({
            where: { id_role: r.id },
            update: {},
            create: {
                id_role: r.id,
                libelle: r.libelle,
                niveau_hierarchique: r.niveau,
                is_global: r.isGlobal,
            },
        });
    }
    let annee = await prisma.annee_universitaire.findFirst({
        where: { statut: client_1.annee_statut.EN_COURS },
        orderBy: { id_annee: 'desc' },
    });
    if (!annee) {
        annee = await prisma.annee_universitaire.create({
            data: {
                libelle: '2025-2026',
                date_debut: new Date('2025-09-01'),
                date_fin: new Date('2026-08-31'),
                statut: client_1.annee_statut.EN_COURS,
            },
        });
    }
    const idAnnee = annee.id_annee;
    const composantesUniques = [...new Set(rows.map((r) => r.composante).filter(Boolean))];
    const entiteByKey = new Map();
    async function getOrCreateEntite(parentId, type, nom, key) {
        const existing = entiteByKey.get(key);
        if (existing)
            return existing;
        const e = await prisma.entite_structure.create({
            data: {
                id_annee: idAnnee,
                id_entite_parent: parentId,
                type_entite: type,
                nom: nom || key,
                tel_service: null,
                bureau_service: null,
            },
        });
        entiteByKey.set(key, e.id_entite);
        if (type === client_1.entite_type.COMPOSANTE) {
            await prisma.composante.upsert({
                where: { id_entite: e.id_entite },
                update: {},
                create: { id_entite: e.id_entite, site_web: null },
            });
        }
        if (type === client_1.entite_type.DEPARTEMENT) {
            await prisma.departement.upsert({
                where: { id_entite: e.id_entite },
                update: {},
                create: { id_entite: e.id_entite, code_interne: null },
            });
        }
        if (type === client_1.entite_type.MENTION) {
            await prisma.mention.upsert({
                where: { id_entite: e.id_entite },
                update: {},
                create: { id_entite: e.id_entite, type_diplome: null },
            });
        }
        if (type === client_1.entite_type.PARCOURS) {
            await prisma.parcours.upsert({
                where: { id_entite: e.id_entite },
                update: {},
                create: { id_entite: e.id_entite, code_parcours: null },
            });
        }
        if (type === client_1.entite_type.NIVEAU) {
            await prisma.niveau.upsert({
                where: { id_entite: e.id_entite },
                update: {},
                create: { id_entite: e.id_entite, libelle_court: null },
            });
        }
        return e.id_entite;
    }
    for (const compNom of composantesUniques) {
        const keyComp = `comp:${compNom}`;
        await getOrCreateEntite(null, client_1.entite_type.COMPOSANTE, compNom, keyComp);
    }
    const deptKeys = new Set();
    for (const r of rows) {
        if (!r.composante || !r.departement)
            continue;
        const key = `comp:${r.composante}|dept:${r.departement}`;
        if (deptKeys.has(key))
            continue;
        deptKeys.add(key);
        const parent = entiteByKey.get(`comp:${r.composante}`);
        if (parent)
            await getOrCreateEntite(parent, client_1.entite_type.DEPARTEMENT, r.departement, key);
    }
    const mentionKeys = new Set();
    for (const r of rows) {
        if (!r.composante || !r.mention)
            continue;
        const parentKey = r.departement ? `comp:${r.composante}|dept:${r.departement}` : `comp:${r.composante}`;
        const parent = entiteByKey.get(parentKey) ?? entiteByKey.get(`comp:${r.composante}`);
        if (!parent)
            continue;
        const key = `${parentKey}|mention:${r.mention}`;
        if (mentionKeys.has(key))
            continue;
        mentionKeys.add(key);
        await getOrCreateEntite(parent, client_1.entite_type.MENTION, r.mention, key);
    }
    const parcoursKeys = new Set();
    for (const r of rows) {
        if (!r.composante || !r.parcours)
            continue;
        const mentionKey = r.mention
            ? (r.departement ? `comp:${r.composante}|dept:${r.departement}` : `comp:${r.composante}`) + `|mention:${r.mention}`
            : null;
        const parent = mentionKey && entiteByKey.has(mentionKey)
            ? entiteByKey.get(mentionKey)
            : r.departement
                ? entiteByKey.get(`comp:${r.composante}|dept:${r.departement}`)
                : entiteByKey.get(`comp:${r.composante}`);
        if (!parent)
            continue;
        const key = (mentionKey || `comp:${r.composante}`) + `|parcours:${r.parcours}`;
        if (parcoursKeys.has(key))
            continue;
        parcoursKeys.add(key);
        await getOrCreateEntite(parent, client_1.entite_type.PARCOURS, r.parcours, key);
    }
    const formationKeys = new Set();
    for (const r of rows) {
        if (!r.composante)
            continue;
        const formationNom = r.formation_nom || r.parcours || r.mention || 'Formation';
        if (formationNom === 'NULL' || !formationNom.trim())
            continue;
        const baseKey = r.departement
            ? `comp:${r.composante}|dept:${r.departement}`
            : `comp:${r.composante}`;
        const mentionPart = r.mention ? `|mention:${r.mention}` : '';
        const parcoursPart = r.parcours ? `|parcours:${r.parcours}` : '';
        const key = `${baseKey}${mentionPart}${parcoursPart}|formation:${formationNom}`;
        if (formationKeys.has(key))
            continue;
        formationKeys.add(key);
        let parent = null;
        if (r.parcours) {
            const pk = baseKey + mentionPart + `|parcours:${r.parcours}`;
            parent = entiteByKey.get(pk) ?? null;
        }
        if (!parent && r.mention) {
            const mk = baseKey + `|mention:${r.mention}`;
            parent = entiteByKey.get(mk) ?? null;
        }
        if (!parent && r.departement)
            parent = entiteByKey.get(baseKey) ?? null;
        if (!parent)
            parent = entiteByKey.get(`comp:${r.composante}`) ?? null;
        if (parent)
            await getOrCreateEntite(parent, client_1.entite_type.NIVEAU, formationNom, key);
    }
    function resolveEntite(r) {
        const comp = entiteByKey.get(`comp:${r.composante}`);
        if (!comp)
            return null;
        const p = (r.perimetre_role || '').toLowerCase();
        if (p.includes('composante'))
            return comp;
        if (r.departement) {
            const dept = entiteByKey.get(`comp:${r.composante}|dept:${r.departement}`);
            if (p.includes('departement') && dept)
                return dept;
            if (r.mention) {
                const mk = `comp:${r.composante}|dept:${r.departement}|mention:${r.mention}`;
                const mention = entiteByKey.get(mk);
                if (p.includes('mention') && mention)
                    return mention;
                if (r.parcours) {
                    const pk = mk + `|parcours:${r.parcours}`;
                    const parcours = entiteByKey.get(pk);
                    if (p.includes('parcours') && parcours)
                        return parcours;
                }
                if (mention)
                    return mention;
                if (dept)
                    return dept;
            }
            if (dept)
                return dept;
        }
        if (r.mention) {
            const mk = r.departement
                ? `comp:${r.composante}|dept:${r.departement}|mention:${r.mention}`
                : `comp:${r.composante}|mention:${r.mention}`;
            const mention = entiteByKey.get(mk);
            if (mention)
                return mention;
        }
        const formKey = r.departement
            ? `comp:${r.composante}|dept:${r.departement}`
            : `comp:${r.composante}`;
        const formationLabel = r.formation_nom && r.formation_nom !== 'NULL' && r.formation_nom.trim()
            ? r.formation_nom
            : (r.parcours || r.mention || 'Formation');
        const formFullKey = formKey + (r.mention ? `|mention:${r.mention}` : '') + (r.parcours ? `|parcours:${r.parcours}` : '') + `|formation:${formationLabel}`;
        return entiteByKey.get(formFullKey) ?? comp;
    }
    const userByKey = new Map();
    const dateDebut = new Date('2025-09-01');
    for (const r of rows) {
        const nom = (r.responsable_nom || '').trim();
        const prenom = (r.responsable_prenom || '').trim();
        const email = (r.email || '').trim();
        if (!nom && !prenom && !email)
            continue;
        const loginKey = email || (prenom && nom ? `${slug(prenom)}.${slug(nom)}` : `contact.${slug((nom || prenom || 'inconnu'))}`);
        const userKey = email ? email.trim().toLowerCase() : `${(nom || '').toLowerCase()}|${(prenom || '').toLowerCase()}`;
        let idUser = userByKey.get(userKey);
        if (idUser === undefined) {
            const existing = email
                ? await prisma.utilisateur.findFirst({ where: { email_institutionnel: { equals: email.trim(), mode: 'insensitive' } }, select: { id_user: true } })
                : (nom || prenom)
                    ? await prisma.utilisateur.findFirst({
                        where: { nom: nom || 'Contact', prenom: prenom || 'Contact' },
                        select: { id_user: true },
                    })
                    : null;
            if (existing) {
                idUser = existing.id_user;
                userByKey.set(userKey, idUser);
            }
            else {
                const login = slug(loginKey).slice(0, 50) || 'user';
                const uniqueLogin = await (async () => {
                    let l = login;
                    let n = 0;
                    while (await prisma.utilisateur.findUnique({ where: { login: l } })) {
                        l = `${login}-${++n}`;
                    }
                    return l;
                })();
                const created = await prisma.utilisateur.create({
                    data: {
                        login: uniqueLogin,
                        nom: nom || 'Contact',
                        prenom: prenom || 'Contact',
                        email_institutionnel: email ? email.trim().toLowerCase() : null,
                        telephone: r.telephone || null,
                        bureau: r.bureau || null,
                        statut: client_1.utilisateur_statut.ACTIF,
                    },
                });
                idUser = created.id_user;
                userByKey.set(userKey, idUser);
            }
        }
        const idEntite = resolveEntite(r);
        if (!idEntite)
            continue;
        const idRole = mapRole(r.role_exact, r.perimetre_role);
        const exists = await prisma.affectation.findFirst({
            where: {
                id_user: idUser,
                id_role: idRole,
                id_entite: idEntite,
                id_annee: idAnnee,
            },
        });
        if (!exists) {
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
    console.log(`Seed CSV terminé: ${composantesUniques.length} composantes (UFR/Institut/IUT), ` +
        `${entiteByKey.size} entités, ${userByKey.size} utilisateurs, affectations créées.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-from-csv.js.map