import csv
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parents[1]
XLSX_PATH = BASE_DIR / 'files' / 'donnee_responsable' / 'Responsables Licence 2025-26.xlsx'
CSV_PATH = BASE_DIR / 'files' / 'donnee_responsable' / 'formations_responsables.csv'
OUT_SQL = BASE_DIR / 'script' / 'db' / 'init' / '004_seed_responsables.sql'

YEAR_ID = 3  # 2025-2026
DATE_DEBUT = '2025-09-01'

# --- Helpers

def slugify(text):
    # ascii-only slug (strip accents)
    import unicodedata
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    if not text:
        return "role"
    return text


def clean_whitespace(s):
    return re.sub(r"\s+", " ", s or "").strip()


def split_name(full):
    full = clean_whitespace(full)
    if not full:
        return "", ""
    parts = full.split()
    if len(parts) == 1:
        return parts[0].title(), parts[0].upper()
    # if uppercase tokens exist, treat them as last name
    upper_tokens = [p for p in parts if p.isupper()]
    if upper_tokens:
        nom = " ".join(upper_tokens)
        prenom = " ".join([p for p in parts if p not in upper_tokens])
        return prenom.title(), nom
    # fallback: first token as prenom, rest as nom
    return parts[0].title(), " ".join(parts[1:]).upper()


def infer_departement(text):
    text = text.lower()
    keywords = {
        'droit': 'Département Droit',
        'informatique': 'Département Informatique',
        'mathématique': 'Département Mathématiques',
        'mathématiques': 'Département Mathématiques',
        'physique': 'Département Physique',
        'chimie': 'Département Chimie',
        'communication': 'Département Communication',
        'sociologie': 'Département Sociologie',
        'science politique': 'Département Science Politique',
        'création numérique': 'Département Création Numérique',
        'sciences pour l’ingénieur': 'Département Sciences pour l’ingénieur',
        'electronique': 'Département Sciences pour l’ingénieur',
        'signal': 'Département Sciences pour l’ingénieur',
        'réseaux': 'Département Sciences pour l’ingénieur',
        'galilée': 'Département Sup Galilée',
        'sup galilée': 'Département Sup Galilée',
    }
    for k, dep in keywords.items():
        if k in text:
            return dep
    return ""


def infer_composante(text):
    text = text.lower()
    if 'galilée' in text:
        return 'Institut Galilée'
    if 'dsps' in text or 'droit' in text or 'science politique' in text or 'sociologie' in text:
        return 'Faculté DSPS (Droit, Sciences politiques et sociales)'
    if 'iut' in text and 'bobigny' in text:
        return 'IUT de Bobigny'
    if 'iut' in text and 'saint-denis' in text:
        return 'IUT de Saint-Denis'
    if 'iut' in text and 'villetaneuse' in text:
        return 'IUT de Villetaneuse'
    if 'communication' in text or 'sciences de l’information' in text:
        return 'UFR des Sciences de l’Information et de la Communication'
    return ""


def infer_mention_from_formation(name):
    name = clean_whitespace(name)
    m = re.search(r"mention\s+([^,]+)", name, flags=re.IGNORECASE)
    if m:
        return clean_whitespace(m.group(1))
    return ""


def is_niveau_like(value):
    v = value.lower()
    return bool(re.search(r"(1ère|2ème|3ème|annee|année|l1|l2|l3|m1|m2)", v))


def extract_niveau_from_role(role):
    r = role.lower()
    if '1ère' in r or '1ere' in r or 'l1' in r:
        if 'n1' in r:
            return '1ère année N1'
        if 'n2' in r:
            return '1ère année N2'
        return '1ère année'
    if '2ème' in r or '2eme' in r or 'l2' in r:
        return '2ème année'
    if '3ème' in r or '3eme' in r or 'l3' in r:
        return '3ème année'
    if 'm1' in r:
        return 'M1'
    if 'm2' in r:
        return 'M2'
    return ""


def map_role(role_label, entite_type):
    label = clean_whitespace(role_label)
    l = label.lower()
    if 'responsable' in l:
        if any(k in l for k in ['année', 'annee', '1ère', '1ere', '2ème', '2eme', '3ème', '3eme', 'm1', 'm2', 'l1', 'l2', 'l3']):
            return 'responsable-annee', 'Responsable annee'
        return 'responsable-formation', 'Responsable de formation'
    if 'directeur' in l or 'directrice' in l:
        if entite_type == 'COMPOSANTE':
            return 'directeur-composante', 'Directeur de composante'
        if entite_type == 'DEPARTEMENT':
            return 'directeur-departement', 'Chef de departement'
        if entite_type == 'MENTION':
            return 'directeur-mention', 'Directeur de mention'
        if entite_type == 'PARCOURS':
            return 'directeur-specialite', 'Directeur de specialite'
    # default: create role from label
    return f"role-{slugify(label)}", label

# --- XLSX parsing

NS = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_xlsx_rows(path):
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = [(sh.get('name'), sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'))
                  for sh in wb.findall('main:sheets/main:sheet', NS)]
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rid_to_target = {rel.get('Id'): rel.get('Target')
                         for rel in rels.findall('rel:Relationship', {'rel':'http://schemas.openxmlformats.org/package/2006/relationships'})}
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss.findall('main:si', NS):
                texts = [t.text or '' for t in si.findall('.//main:t', NS)]
                shared.append(''.join(texts))
        if not sheets:
            return []
        target = rid_to_target[sheets[0][1]]
        if not target.startswith('xl/'):
            target = 'xl/' + target
        sheet = ET.fromstring(z.read(target))
        rows = {}
        for c in sheet.findall('.//main:c', NS):
            ref = c.get('r')
            if not ref:
                continue
            col = ''.join([x for x in ref if x.isalpha()])
            row = int(''.join([x for x in ref if x.isdigit()]))
            col_idx = 0
            for ch in col:
                col_idx = col_idx * 26 + (ord(ch) - 64)
            v = c.find('main:v', NS)
            if v is None:
                val = ''
            else:
                val = v.text or ''
                if c.get('t') == 's':
                    try:
                        val = shared[int(val)]
                    except Exception:
                        pass
            rows.setdefault(row, {})[col_idx] = val
        out = []
        for r in sorted(rows.keys()):
            cols = rows[r]
            maxc = max(cols) if cols else 0
            row_vals = [cols.get(i, '') for i in range(1, maxc + 1)]
            out.append((r, row_vals))
        return out

emoji_re = re.compile(r'[\U0001F300-\U0001FAFF\U00002600-\U000027BF]')

def clean_title(t):
    return emoji_re.sub('', t or '').strip(' -–—')

xlsx_entries = []
if XLSX_PATH.exists():
    rows = read_xlsx_rows(XLSX_PATH)
    current_section = None
    in_table = False
    for _, row in rows:
        row = [clean_whitespace(c) for c in row]
        while row and row[-1] == '':
            row.pop()
        if not row:
            continue
        if len(row) == 1 and row[0].lower() != 'fonction':
            current_section = clean_title(row[0]) or 'GENERAL'
            in_table = False
            continue
        if row and row[0].lower() == 'fonction':
            in_table = True
            continue
        if not in_table:
            # ignore stray rows
            continue
        # data row: Fonction, Nom, Bureau, Contact, Telephone
        func = row[0] if len(row) > 0 else ''
        nom = row[1] if len(row) > 1 else ''
        bureau = row[2] if len(row) > 2 else ''
        contact = row[3] if len(row) > 3 else ''
        tel = row[4] if len(row) > 4 else ''
        xlsx_entries.append({
            'section': current_section or 'GENERAL',
            'fonction': func,
            'nom': nom,
            'bureau': bureau,
            'email': contact,
            'telephone': tel,
        })

# --- CSV parsing
csv_entries = []
with open(CSV_PATH, newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        csv_entries.append(r)

# --- Build normalized entities

entite_ids = {}
next_entite_id = 1000

roles = {}

users = {}
user_ids = {}
next_user_id = 1000
used_logins = set()

affectations = []
contact_roles = []

# Entities storage
composantes = {}

def get_entite_id(type_entite, name, parent_id=None):
    global next_entite_id
    key = (type_entite, name, parent_id)
    if key in entite_ids:
        return entite_ids[key]
    entite_ids[key] = next_entite_id
    next_entite_id += 1
    return entite_ids[key]


def get_user_id(prenom, nom, email=None, tel=None, bureau=None):
    global next_user_id
    key = (email.lower().strip() if email else None, prenom.lower().strip(), nom.lower().strip())
    if key in users:
        uid = users[key]
        # update missing info
        u = user_ids[uid]
        if email and not u['email']:
            u['email'] = email
        if tel and not u['telephone']:
            u['telephone'] = tel
        if bureau and not u['bureau']:
            u['bureau'] = bureau
        return uid
    uid = next_user_id
    next_user_id += 1
    users[key] = uid
    login_base = f"{prenom}.{nom}".lower().replace(' ', '.')
    login_base = re.sub(r"[^a-z0-9.]+", "", login_base)
    login = login_base or f"user{uid}"
    if login in used_logins:
        suffix = 2
        while f"{login}.{suffix}" in used_logins:
            suffix += 1
        login = f"{login}.{suffix}"
    used_logins.add(login)
    user_ids[uid] = {
        'id': uid,
        'login': login,
        'nom': nom,
        'prenom': prenom,
        'email': email,
        'telephone': tel,
        'bureau': bureau,
    }
    return uid

# --- CSV entries -> entities and affectations
for r in csv_entries:
    formation_nom = clean_whitespace(r.get('formation_nom'))
    composante = clean_whitespace(r.get('composante'))
    departement = clean_whitespace(r.get('departement'))
    mention = clean_whitespace(r.get('mention'))
    parcours = clean_whitespace(r.get('parcours'))
    role_exact = clean_whitespace(r.get('role_exact'))
    nom = clean_whitespace(r.get('responsable_nom'))
    prenom = clean_whitespace(r.get('responsable_prenom'))
    email = clean_whitespace(r.get('email'))
    tel = clean_whitespace(r.get('telephone'))
    bureau = clean_whitespace(r.get('bureau'))

    if not composante:
        composante = infer_composante(' '.join([formation_nom, mention, departement]))
    if not departement:
        departement = infer_departement(' '.join([formation_nom, mention, composante]))
    if not mention:
        mention = infer_mention_from_formation(formation_nom)
    niveau = ''
    parcours_name = ''
    if parcours:
        if is_niveau_like(parcours):
            niveau = parcours
            parcours_name = 'Tronc commun'
        else:
            parcours_name = parcours
    else:
        parcours_name = 'Tronc commun' if mention or departement or composante else ''

    # build entite chain
    entite_id = None
    if composante:
        comp_id = get_entite_id('COMPOSANTE', composante, None)
        entite_id = comp_id
    if departement:
        dep_id = get_entite_id('DEPARTEMENT', departement, entite_id)
        entite_id = dep_id
    if mention:
        men_id = get_entite_id('MENTION', mention, entite_id)
        entite_id = men_id
    if parcours_name:
        par_id = get_entite_id('PARCOURS', parcours_name, entite_id)
        entite_id = par_id
    if niveau:
        niv_id = get_entite_id('NIVEAU', niveau, entite_id)
        entite_id = niv_id

    if not entite_id:
        continue

    # roles
    role_id, role_label = map_role(role_exact or 'Responsable', 'NIVEAU')
    roles.setdefault(role_id, role_label)

    # user
    if not prenom and not nom:
        continue
    if not nom:
        prenom, nom = split_name(prenom)
    uid = get_user_id(prenom, nom, email or None, tel or None, bureau or None)

    affectations.append({
        'user_id': uid,
        'role_id': role_id,
        'entite_id': entite_id,
        'annee_id': YEAR_ID,
        'date_debut': DATE_DEBUT,
    })
    if email:
        contact_roles.append({
            'aff_key': (uid, role_id, entite_id, YEAR_ID),
            'email': email,
            'type_email': 'fonction'
        })

# --- XLSX entries -> entities and affectations
for r in xlsx_entries:
    section = clean_whitespace(r.get('section'))
    fonction = clean_whitespace(r.get('fonction'))
    full_name = clean_whitespace(r.get('nom'))
    email = clean_whitespace(r.get('email'))
    tel = clean_whitespace(r.get('telephone'))
    bureau = clean_whitespace(r.get('bureau'))

    composante = 'Institut Galilée'
    departement = ''
    mention = ''
    parcours_name = ''
    niveau = ''

    if section.upper() == 'GENERAL':
        # composante level
        pass
    elif section.lower().startswith('secrétariat') or section.lower().startswith('secretariat'):
        # composante-level secretariats
        pass
    else:
        # treat section as mention; infer departement for some known sections
        mention = section
        departement = infer_departement(section)
        parcours_name = 'Tronc commun'
        niveau = extract_niveau_from_role(fonction)

    entite_id = None
    comp_id = get_entite_id('COMPOSANTE', composante, None)
    entite_id = comp_id
    if departement:
        dep_id = get_entite_id('DEPARTEMENT', departement, entite_id)
        entite_id = dep_id
    if mention:
        men_id = get_entite_id('MENTION', mention, entite_id)
        entite_id = men_id
    if parcours_name:
        par_id = get_entite_id('PARCOURS', parcours_name, entite_id)
        entite_id = par_id
    if niveau:
        niv_id = get_entite_id('NIVEAU', niveau, entite_id)
        entite_id = niv_id

    role_id, role_label = map_role(fonction or 'Responsable', 'NIVEAU' if niveau else 'MENTION' if mention else 'COMPOSANTE')
    roles.setdefault(role_id, role_label)

    prenom, nom = split_name(full_name)
    uid = get_user_id(prenom, nom, email or None, tel or None, bureau or None)

    affectations.append({
        'user_id': uid,
        'role_id': role_id,
        'entite_id': entite_id,
        'annee_id': YEAR_ID,
        'date_debut': DATE_DEBUT,
    })
    if email:
        contact_roles.append({
            'aff_key': (uid, role_id, entite_id, YEAR_ID),
            'email': email,
            'type_email': 'fonction'
        })

# --- Build insert statements

# prepare entite structure lists
entites_by_type = defaultdict(list)
for (type_entite, name, parent_id), ent_id in entite_ids.items():
    entites_by_type[type_entite].append((ent_id, name, parent_id))

# role inserts (avoid duplicates for existing ids)
role_rows = []
for role_id, label in sorted(roles.items()):
    if role_id in ['responsable-formation', 'responsable-annee', 'directeur-composante', 'directeur-departement', 'directeur-mention', 'directeur-specialite']:
        continue
    role_rows.append((role_id, label))

# --- Add test users per role

def pick_entite_for_role(role_id):
    if role_id == 'responsable-annee':
        if entites_by_type['NIVEAU']:
            return entites_by_type['NIVEAU'][0][0]
    if role_id == 'responsable-formation':
        if entites_by_type['PARCOURS']:
            return entites_by_type['PARCOURS'][0][0]
    if role_id == 'directeur-mention':
        if entites_by_type['MENTION']:
            return entites_by_type['MENTION'][0][0]
    if role_id == 'directeur-departement':
        if entites_by_type['DEPARTEMENT']:
            return entites_by_type['DEPARTEMENT'][0][0]
    if role_id == 'directeur-composante':
        if entites_by_type['COMPOSANTE']:
            return entites_by_type['COMPOSANTE'][0][0]
    if role_id == 'directeur-specialite':
        if entites_by_type['PARCOURS']:
            return entites_by_type['PARCOURS'][0][0]
    # default to composante
    if entites_by_type['COMPOSANTE']:
        return entites_by_type['COMPOSANTE'][0][0]
    # fallback to any entite
    for t in ['DEPARTEMENT','MENTION','PARCOURS','NIVEAU']:
        if entites_by_type[t]:
            return entites_by_type[t][0][0]
    return None

all_role_ids = set(roles.keys()) | {
    'directeur-composante',
    'directeur-departement',
    'directeur-mention',
    'directeur-specialite',
    'responsable-formation',
    'responsable-annee',
    'utilisateur-simple',
    'administrateur',
    'services-centraux',
}

for rid in sorted(all_role_ids):
    ent_id = pick_entite_for_role(rid)
    if ent_id is None:
        continue
    test_login = f"test.{rid}".replace("_", "-")
    test_login = re.sub(r"[^a-z0-9.\-]+", "", test_login.lower())
    test_nom = rid.replace("-", " ").upper()
    test_prenom = "Test"
    uid = get_user_id(test_prenom, test_nom, None, None, None)
    # override login for test users to be role-specific
    if test_login in used_logins:
        suffix = 2
        while f"{test_login}.{suffix}" in used_logins:
            suffix += 1
        test_login = f"{test_login}.{suffix}"
    used_logins.discard(user_ids[uid]["login"])
    user_ids[uid]["login"] = test_login
    used_logins.add(test_login)
    affectations.append({
        "user_id": uid,
        "role_id": rid,
        "entite_id": ent_id,
        "annee_id": YEAR_ID,
        "date_debut": DATE_DEBUT,
    })

# de-duplicate affectations
seen_aff = set()
uniq_affectations = []
for a in affectations:
    key = (a['user_id'], a['role_id'], a['entite_id'], a['annee_id'])
    if key in seen_aff:
        continue
    seen_aff.add(key)
    uniq_affectations.append(a)

# map affectation key to temp id

# --- Write SQL
lines = []
lines.append('-- Seed responsables reelles (CSV + XLSX)')
lines.append('-- Genere automatiquement par script/build_seed_responsables.py')
lines.append('')

# roles
if role_rows:
    lines.append('insert into role (id_role, libelle, description, niveau_hierarchique, is_global) values')
    vals = []
    for role_id, label in role_rows:
        vals.append(f"  ('{role_id}', '{label.replace("'", "''")}', 'Import CSV/XLSX', 10, true)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

# entite_structure
lines.append('insert into entite_structure (id_entite, id_annee, id_entite_parent, type_entite, nom) values')
vals = []
for type_entite in ['COMPOSANTE','DEPARTEMENT','MENTION','PARCOURS','NIVEAU']:
    for ent_id, name, parent_id in sorted(entites_by_type[type_entite], key=lambda x: x[0]):
        parent_val = 'null' if parent_id is None else str(parent_id)
        vals.append(f"  ({ent_id}, {YEAR_ID}, {parent_val}, '{type_entite}', '{name.replace("'", "''")}')")
lines.append(',\n'.join(vals) + ';')
lines.append('')

# specialized tables
if entites_by_type['COMPOSANTE']:
    lines.append('insert into composante (id_entite, site_web) values')
    vals = []
    for ent_id, name, _ in sorted(entites_by_type['COMPOSANTE'], key=lambda x: x[0]):
        vals.append(f"  ({ent_id}, null)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

if entites_by_type['DEPARTEMENT']:
    lines.append('insert into departement (id_entite, code_interne) values')
    vals = []
    for ent_id, name, _ in sorted(entites_by_type['DEPARTEMENT'], key=lambda x: x[0]):
        vals.append(f"  ({ent_id}, null)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

if entites_by_type['MENTION']:
    lines.append('insert into mention (id_entite, type_diplome) values')
    vals = []
    for ent_id, name, _ in sorted(entites_by_type['MENTION'], key=lambda x: x[0]):
        vals.append(f"  ({ent_id}, null)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

if entites_by_type['PARCOURS']:
    lines.append('insert into parcours (id_entite, code_parcours) values')
    vals = []
    for ent_id, name, _ in sorted(entites_by_type['PARCOURS'], key=lambda x: x[0]):
        vals.append(f"  ({ent_id}, null)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

if entites_by_type['NIVEAU']:
    lines.append('insert into niveau (id_entite, libelle_court) values')
    vals = []
    for ent_id, name, _ in sorted(entites_by_type['NIVEAU'], key=lambda x: x[0]):
        vals.append(f"  ({ent_id}, null)")
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

# utilisateurs
lines.append('insert into utilisateur (id_user, login, nom, prenom, email_institutionnel, telephone, bureau, statut) values')
vals = []
for uid in sorted(user_ids):
    u = user_ids[uid]
    vals.append(
        "  ({id}, '{login}', '{nom}', '{prenom}', {email}, {tel}, {bureau}, 'ACTIF')".format(
            id=uid,
            login=u['login'].replace("'", "''"),
            nom=u['nom'].replace("'", "''"),
            prenom=u['prenom'].replace("'", "''"),
            email=('null' if not u['email'] else "'{}'".format(u['email'].replace("'", "''"))),
            tel=('null' if not u['telephone'] else "'{}'".format(u['telephone'].replace("'", "''"))),
            bureau=('null' if not u['bureau'] else "'{}'".format(u['bureau'].replace("'", "''"))),
        )
    )
lines.append(',\n'.join(vals) + ';')
lines.append('')

# affectations
lines.append('insert into affectation (id_affectation, id_user, id_role, id_entite, id_annee, date_debut, date_fin) values')
vals = []
next_aff_id = 2000
aff_key_to_id = {}
for a in uniq_affectations:
    aff_id = next_aff_id
    next_aff_id += 1
    key = (a['user_id'], a['role_id'], a['entite_id'], a['annee_id'])
    aff_key_to_id[key] = aff_id
    vals.append(
        f"  ({aff_id}, {a['user_id']}, '{a['role_id']}', {a['entite_id']}, {a['annee_id']}, '{a['date_debut']}', null)"
    )
lines.append(',\n'.join(vals) + ';')
lines.append('')

# contact_role
if contact_roles:
    lines.append('insert into contact_role (id_contact_role, id_affectation, email_fonctionnelle, type_email) values')
    vals = []
    next_contact_id = 3000
    for cr in contact_roles:
        aff_id = aff_key_to_id.get(cr['aff_key'])
        if not aff_id:
            continue
        vals.append(
            "  ({id}, {aff}, '{email}', '{typ}')".format(
                id=next_contact_id,
                aff=aff_id,
                email=cr['email'].replace("'", "''"),
                typ=cr['type_email']
            )
        )
        next_contact_id += 1
    lines.append(',\n'.join(vals) + ';')
    lines.append('')

# reset sequences
lines.append('-- Recalage des sequences')
lines.append("select setval(pg_get_serial_sequence('entite_structure','id_entite'), (select max(id_entite) from entite_structure));")
lines.append("select setval(pg_get_serial_sequence('utilisateur','id_user'), (select max(id_user) from utilisateur));")
lines.append("select setval(pg_get_serial_sequence('affectation','id_affectation'), (select max(id_affectation) from affectation));")
lines.append("select setval(pg_get_serial_sequence('contact_role','id_contact_role'), (select max(id_contact_role) from contact_role));")

OUT_SQL.write_text("\n".join(lines), encoding='utf-8')

print('Wrote', OUT_SQL)
print('Entities:', len(entite_ids))
print('Users:', len(user_ids))
print('Affectations:', len(uniq_affectations))
print('Contact roles:', len(contact_roles))
print('Roles added:', len(role_rows))
