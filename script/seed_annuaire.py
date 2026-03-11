#!/usr/bin/env python3
"""
Lit files/assets/Annuaire.xlsx → génère script/annuaire_seed.sql
Usage : python3 script/seed_annuaire.py
"""

import zipfile, xml.etree.ElementTree as ET, re, unicodedata
from pathlib import Path

BASE = Path(__file__).parent.parent
XLSX = BASE / 'files' / 'assets' / 'Annuaire.xlsx'
OUT  = BASE / 'script' / 'annuaire_seed.sql'

NS = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

# ── Helpers ──────────────────────────────────────────────────────────────────

def q(s):
    if s is None or s == '':
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def clean(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()

def slug(s):
    s = unicodedata.normalize('NFKD', clean(s).lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-') or 'user'

def genre_to_enum(civ):
    civ = clean(civ).upper()
    if civ in ('F',): return 'F'
    if civ in ('M',): return 'M'
    return None

def categorie_to_enum(cat):
    cat = clean(cat).upper()
    if cat in ('EC', 'ENSEIGNANT-CHERCHEUR'): return 'EC'
    if cat in ('BIATSS',): return 'BIATSS'
    if cat in ('ESAS',): return 'ESAS'
    if cat in ('CONTRACTUEL', 'CONTRACTUELLE'): return 'CONTRACTUEL'
    if cat in ('VACATAIRE',): return 'VACATAIRE'
    return None

def composante_type_from_nom(nom, code):
    nom_l = nom.lower()
    if 'iut' in nom_l: return 'IUT'
    if 'institut' in nom_l: return 'INSTITUT'
    return 'UFR'

def cycle_from_type(type_col, diplome):
    t = clean(type_col).upper()
    d = clean(diplome).lower()
    if any(t.startswith(x) for x in ('L', 'BUT', 'LPRO', 'LAS', 'DEUST', 'PASS', 'DFGSM', 'DFASM')):
        return 1
    if any(t.startswith(x) for x in ('M', 'ING', 'DE', 'DES', 'DESC', 'DFMS', 'DFMSA')):
        return 2
    if 'licence' in d or 'but' in d or 'pass' in d: return 1
    if 'master' in d or 'ingenieur' in d: return 2
    return None

# ── Lecture XLSX ─────────────────────────────────────────────────────────────

def read_xlsx(path):
    sheets_data = {}
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = [(sh.get('name'),
                   sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'))
                  for sh in wb.findall('main:sheets/main:sheet', NS)]
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rid_to_target = {
            r.get('Id'): r.get('Target')
            for r in rels.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
        }
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss.findall('main:si', NS):
                shared.append(''.join(t.text or '' for t in si.findall('.//main:t', NS)))

        for name, rid in sheets:
            target = rid_to_target[rid]
            if not target.startswith('xl/'): target = 'xl/' + target
            sheet = ET.fromstring(z.read(target))
            rows = {}
            for c in sheet.findall('.//main:c', NS):
                ref = c.get('r')
                col_str = ''.join(x for x in ref if x.isalpha())
                row_num = int(''.join(x for x in ref if x.isdigit()))
                col_idx = sum((ord(ch) - 64) * 26 ** (len(col_str) - i - 1)
                              for i, ch in enumerate(col_str))
                v = c.find('main:v', NS)
                val = ''
                if v is not None:
                    val = v.text or ''
                    if c.get('t') == 's':
                        try: val = shared[int(val)]
                        except: pass
                rows.setdefault(row_num, {})[col_idx] = clean(val)
            out = []
            for r in sorted(rows):
                cols = rows[r]
                maxc = max(cols) if cols else 0
                out.append([cols.get(i, '') for i in range(1, maxc + 1)])
            sheets_data[name] = out
    return sheets_data

# ── Mapping rôles ─────────────────────────────────────────────────────────────

ROLE_MAP = [
    (r'doyen|directeur de composante|directrice de composante|administrateur provisoire', 'directeur-composante'),
    (r'directeur administratif adjoint|da adjoint|directrice administrative adjointe', 'directeur-administratif-adjoint'),
    (r'directeur administratif|directrice administrative', 'directeur-administratif'),
    (r'directeur adjoint.*licence|charg.*cycle licence', 'directeur-adjoint-licence'),
    (r'responsable.*service p.dagogique adjoint|responsable adjoint.*service p.dagogique', 'responsable-adjoint-service-pedagogique'),
    (r'responsable.*service p.dagogique', 'responsable-service-pedagogique'),
    (r'vice.*pr.sident.*d.partement|vice-pr.sident.*d.partement', 'vice-president-departement'),
    (r'pr.sident.*d.partement|chef.*d.partement|directeur.*d.partement|directrice.*d.partement', 'directeur-departement'),
    (r'directeur.*composante|directrice.*composante', 'directeur-composante'),
    (r'responsable.*mention|directeur.*mention|directrice.*mention', 'directeur-mention'),
    (r'directeur.*sp.cialit.|directeur.*parcours|responsable.*sp.cialit.', 'directeur-specialite'),
    (r"responsable.*(d')?ann.e.*directeur.*tudes|responsable.*(de)?\s*(premi|deuxi|troisi|premiè|deuxiè|troisiè)", 'responsable-annee'),
    (r"responsable.*ann.e|responsable.*semestre", 'responsable-annee'),
    (r'directeur.*tudes|directrice.*tudes', 'directeur-etudes'),
    (r'secr.taire p.dagogique|secr.tariat p.dagogique', 'secretariat-pedagogique'),
    (r'responsable qualit.', 'responsable-qualite'),
    (r'responsable international', 'responsable-international'),
    (r'directeur adjoint.*cole|directrice adjointe.*cole', 'directeur-adjoint-ecole'),
    (r'r.f.rent', 'referent-commun'),
]

def map_role(fonction_label):
    l = fonction_label.lower()
    for pattern, role_id in ROLE_MAP:
        if re.search(pattern, l):
            return role_id
    return 'utilisateur-simple'

# ── Correspondance type diplôme ───────────────────────────────────────────────

TD_LIBELLE_MAP = {
    'Licence': 'Licence',
    'L': 'Licence',
    'Master': 'Master',
    'M': 'Master',
    'Ingenieur': 'Ingénieur',
    'ING': 'Ingénieur',
    'Bachelor Universitaire de Technologie': 'Bachelor universitaire de technologie',
    'BUT': 'Bachelor universitaire de technologie',
    'Licence Professionnelle': 'Licence professionnelle',
    'LPro': 'Licence professionnelle',
    'Capacite': 'Capacité',
    'Diplome Universitaire': "Diplôme d'université",
    'DU': "Diplôme d'université",
    "Diplôme d'état": "Diplôme d'État",
    "DE": "Diplôme d'État",
    "Diplôme d'Etudes Spécialisées": "Diplôme d'études spécialisées",
    "DES": "Diplôme d'études spécialisées",
    "Diplôme d'Etudes Spécialisées Complémentaires": "Diplôme d'études spécialisées complémentaires",
    "DESC": "Diplôme d'études spécialisées complémentaires",
    "Diplôme d'Etudes Universitaires Scientifiques et Techniques": "DEUST",
    "DEUST": "DEUST",
    "Diplôme de Formation Approfondie en Sciences Médicales": "Diplôme d'État",
    "Diplôme de Formation Générale en Sciences Médicales": "Diplôme d'État",
    "Diplôme de Formation Médicale Spécialisée": "Diplôme d'État",
    "Diplôme de Formation Médicale Spécialisée Approfondie": "Diplôme d'État",
    "DFASM": "Diplôme d'État",
    "DFGSM": "Diplôme d'État",
    "DFMS": "Diplôme d'État",
    "DFMSA": "Diplôme d'État",
    "Licence acces sante": "Licence",
    "LAS": "Licence",
    "PASS": "Diplôme d'État",
    "Preparation du CRFPA à l'institut d'Etudes Judiciaires": "Diplôme d'université",
    "PrepaIEJ": "Diplôme d'université",
}

# ── Données de référence ──────────────────────────────────────────────────────

TYPES_DIPLOMES = [
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
]

ROLES_REF = [
    ('services-centraux',                   'Services centraux',                    0,  True,  False, False),
    ('administrateur',                       'Administrateur',                       0,  True,  False, False),
    ('directeur-composante',                 'Directeur de composante',              1,  False, False, False),
    ('directeur-administratif',              'Directeur administratif',              2,  False, True,  False),
    ('directeur-administratif-adjoint',      'Directeur administratif adjoint',      3,  False, True,  False),
    ('directeur-departement',                'Directeur de département',             4,  False, False, False),
    ('vice-president-departement',           'Vice-président de département',        5,  False, False, False),
    ('directeur-adjoint-licence',            'Directeur adjoint licence',            5,  False, False, False),
    ('responsable-service-pedagogique',      'Responsable service pédagogique',      5,  False, True,  False),
    ('responsable-adjoint-service-pedagogique', 'Responsable adjoint service pédagogique', 6, False, True, False),
    ('directeur-mention',                    'Directeur de mention',                 6,  False, False, False),
    ('directeur-specialite',                 'Directeur de spécialité',              7,  False, False, False),
    ('responsable-formation',                'Responsable de formation',             8,  False, False, False),
    ('responsable-annee',                    "Responsable d'année",                  9,  False, False, False),
    ('directeur-etudes',                     'Directeur des études',                 9,  False, False, False),
    ('responsable-qualite',                  'Responsable qualité',                  10, False, False, True),
    ('responsable-international',            'Responsable international',            10, False, False, True),
    ('referent-commun',                      'Référent commun',                      10, False, False, True),
    ('directeur-adjoint-ecole',              "Directeur adjoint d'école",            10, False, False, True),
    ('secretariat-pedagogique',              'Secrétariat pédagogique',              11, False, True,  False),
    ('utilisateur-simple',                   'Utilisateur simple',                   20, False, False, False),
    ('lecture-seule',                        'Lecture seule',                        99, True,  False, False),
]

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f'Lecture de {XLSX} ...')
    sheets = read_xlsx(XLSX)

    lines = []
    lines += [
        '-- Seed généré automatiquement depuis Annuaire.xlsx',
        '-- script/seed_annuaire.py',
        '',
        'BEGIN;',
        '',
        '-- Vider toutes les tables (cascade)',
        "TRUNCATE TABLE contact_role, affectation, delegation, demande_modification,",
        "  demande_role, signalement, notification, journal_audit, organigramme,",
        "  niveau, parcours, mention, departement, composante, entite_structure,",
        "  utilisateur, role, type_diplome, annee_universitaire CASCADE;",
        '',
    ]

    # ── 1. Types de diplômes ──────────────────────────────────────────────────
    lines.append('-- Types de diplômes')
    lines.append('INSERT INTO type_diplome (id_type_diplome, libelle, is_active) VALUES')
    td_rows = [f"  ({i+1}, {q(lib)}, true)" for i, lib in enumerate(TYPES_DIPLOMES)]
    lines.append(',\n'.join(td_rows) + ';')
    lines.append(f"SELECT setval(pg_get_serial_sequence('type_diplome','id_type_diplome'), {len(TYPES_DIPLOMES)});")
    lines.append('')

    td_id = {lib: i+1 for i, lib in enumerate(TYPES_DIPLOMES)}

    def get_td_id(diplome_label):
        normalized = TD_LIBELLE_MAP.get(diplome_label) or TD_LIBELLE_MAP.get(clean(diplome_label))
        if normalized and normalized in td_id:
            return td_id[normalized]
        if diplome_label in td_id:
            return td_id[diplome_label]
        return None

    # ── 2. Rôles ──────────────────────────────────────────────────────────────
    lines.append('-- Rôles')
    lines.append('INSERT INTO role (id_role, libelle, niveau_hierarchique, is_global, est_administratif, est_transverse) VALUES')
    role_rows = [
        f"  ({q(rid)}, {q(lib)}, {niv}, {str(gl).lower()}, {str(adm).lower()}, {str(tr).lower()})"
        for rid, lib, niv, gl, adm, tr in ROLES_REF
    ]
    lines.append(',\n'.join(role_rows) + ';')
    lines.append('')

    # ── 3. Année universitaire ────────────────────────────────────────────────
    lines += [
        '-- Année universitaire',
        "INSERT INTO annee_universitaire (id_annee, libelle, date_debut, date_fin, statut) VALUES",
        "  (1, '2025-2026', '2025-09-01', '2026-08-31', 'EN_COURS');",
        "SELECT setval(pg_get_serial_sequence('annee_universitaire','id_annee'), 1);",
        '',
    ]
    ANNEE_ID = 1

    # ── 4. Lecture feuille Composantes ────────────────────────────────────────
    comp_sheet = sheets.get('Composantes', [])
    composantes = {}  # code → dict
    for row in comp_sheet[2:]:  # skip 2 header rows
        if not row or not row[0]: continue
        code = clean(row[0])
        if not code.isdigit(): continue
        def g(r, i): return r[i] if i < len(r) else ''
        composantes[code] = {
            'code': code,
            'signe': g(row, 1),
            'nom': g(row, 2),
            'campus': g(row, 3),
            'campus2': g(row, 4),
            'dir_fonction': g(row, 5),
            'dir_civ': g(row, 6),
            'dir_prenom': g(row, 7),
            'dir_nom': g(row, 8),
            'dir_mail_inst': g(row, 9),
            'dir_mail_fonc': g(row, 10),
            'da_civ': g(row, 11),
            'da_prenom': g(row, 12),
            'da_nom': g(row, 13),
            'da_mail_inst': g(row, 14),
            'da_mail_fonc': g(row, 15),
        }
    print(f'Composantes trouvées : {list(composantes.keys())}')

    # ── 5. Construction des entités et utilisateurs ───────────────────────────
    next_entite = [2000]
    next_user   = [5000]
    next_aff    = [8000]
    next_cr     = [9000]

    # entite_cache: (type, nom_lowercase, parent_id) → id
    entite_cache = {}
    # entite_names: id → nom original
    entite_names = {}
    user_by_key  = {}   # (email_lower ou prenom|nom) → id
    user_data    = {}   # id → dict

    used_logins  = set()
    affectations = []
    contact_roles= []
    aff_seen     = set()  # (uid, role_id, entite_id) pour dédupliquer

    def get_entite(type_e, nom, parent_id=None):
        key = (type_e, nom.lower(), parent_id)
        if key in entite_cache:
            return entite_cache[key]
        eid = next_entite[0]; next_entite[0] += 1
        entite_cache[key] = eid
        entite_names[eid] = nom  # stocker le nom original
        return eid

    def get_user(prenom, nom, genre=None, categorie=None,
                 mail_inst=None, mail_inst2=None, tel=None, bureau=None):
        ukey = (mail_inst.lower().strip() if mail_inst else None,
                prenom.lower().strip(), nom.lower().strip())
        if ukey in user_by_key:
            uid = user_by_key[ukey]
            u = user_data[uid]
            if mail_inst and not u['mail_inst']: u['mail_inst'] = mail_inst
            if mail_inst2 and not u['mail_inst2']: u['mail_inst2'] = mail_inst2
            if tel and not u['tel']: u['tel'] = tel
            if bureau and not u['bureau']: u['bureau'] = bureau
            if genre and not u['genre']: u['genre'] = genre
            if categorie and not u['categorie']: u['categorie'] = categorie
            return uid
        uid = next_user[0]; next_user[0] += 1
        user_by_key[ukey] = uid
        login_base = ''
        if mail_inst:
            login_base = mail_inst.split('@')[0]
        if not login_base and prenom and nom:
            login_base = f"{slug(prenom)}.{slug(nom)}"
        if not login_base:
            login_base = f"user{uid}"
        login = re.sub(r'[^a-z0-9.\-]+', '', login_base.lower())[:60] or f"user{uid}"
        if login in used_logins:
            n = 2
            while f"{login}.{n}" in used_logins: n += 1
            login = f"{login}.{n}"
        used_logins.add(login)
        user_data[uid] = {
            'login': login, 'nom': nom or 'Contact', 'prenom': prenom or 'Contact',
            'genre': genre, 'categorie': categorie,
            'mail_inst': mail_inst, 'mail_inst2': mail_inst2,
            'tel': tel, 'bureau': bureau,
        }
        return uid

    def add_aff(uid, role_id, entite_id, mail_fonc=None):
        dedup_key = (uid, role_id, entite_id)
        if dedup_key in aff_seen:
            return None
        aff_seen.add(dedup_key)
        aff_id = next_aff[0]; next_aff[0] += 1
        affectations.append({
            'id': aff_id, 'uid': uid, 'role': role_id,
            'entite': entite_id, 'annee': ANNEE_ID,
        })
        if mail_fonc:
            cr_id = next_cr[0]; next_cr[0] += 1
            contact_roles.append({
                'id': cr_id, 'aff_id': aff_id,
                'email': mail_fonc, 'type': 'fonctionnel',
            })
        return aff_id

    entite_comp  = {}   # code → entite_id
    entite_dept  = {}   # (code_comp, dept_nom_lower) → entite_id
    entite_ment  = {}   # (code_comp, dept_nom_lower, ment_nom_lower) → entite_id
    entite_parc  = {}   # (code_comp, dept_nom_lower, ment_nom_lower, parc_nom_lower) → entite_id
    entite_niv   = {}   # (code_comp, dept_nom_lower, ment_nom_lower, parc_nom_lower, type_col_lower) → entite_id

    # mention metadata: eid → {cycle, td_id}
    mention_meta = {}

    # ── 5a. Composantes ───────────────────────────────────────────────────────
    for code, c in composantes.items():
        eid = get_entite('COMPOSANTE', c['nom'])
        entite_comp[code] = eid

        if c['dir_nom']:
            uid = get_user(
                c['dir_prenom'], c['dir_nom'],
                genre=genre_to_enum(c['dir_civ']),
                mail_inst=c['dir_mail_inst'] or None,
                categorie='EC',
            )
            add_aff(uid, 'directeur-composante', eid, mail_fonc=c['dir_mail_fonc'] or None)

        if c['da_nom']:
            uid = get_user(
                c['da_prenom'], c['da_nom'],
                genre=genre_to_enum(c['da_civ']),
                mail_inst=c['da_mail_inst'] or None,
                categorie='BIATSS',
            )
            add_aff(uid, 'directeur-administratif', eid, mail_fonc=c['da_mail_fonc'] or None)

    # ── 5b. Feuilles de données (903-IG, 925-IUTB, …) ────────────────────────
    data_sheets = [name for name in sheets if re.match(r'^\d{3}', name)]
    print(f'Feuilles données : {data_sheets}')

    for sheet_name in data_sheets:
        rows = sheets[sheet_name]
        if not rows: continue
        headers = [clean(h).lower() for h in rows[0]]

        def col(row, name):
            aliases = {
                'composante':         ['composante'],
                'type_diplome':       ['type diplome'],
                'departement':        ['département', 'departement'],
                'mention':            ['mention'],
                'code_etape':         ['code étape', 'code etape'],
                'parcours':           ['parcours'],
                'type':               ['type'],
                'n':                  ['n'],
                'cat_fonction':       ['catégorie fonction', 'categorie fonction'],
                'prenom':             ['prénom', 'prenom'],
                'nom':                ['nom'],
                'civilite':           ['civilité', 'civilite'],
                'cat_personnel':      ['catégorie personnel', 'categorie personnel'],
                'mail_inst':          ['mail institutionnel'],
                'mail_inst2':         ['autre mail institutionnel'],
                'mail_fonc':          ['mail fonctionnel'],
                'bureau':             ['bureau'],
                'telephone':          ['téléphone', 'telephone'],
                'n_plus_1':           ['n+1'],
            }
            for alias in aliases.get(name, [name]):
                try:
                    idx = headers.index(alias)
                    return row[idx] if idx < len(row) else ''
                except ValueError:
                    pass
            return ''

        for row in rows[1:]:
            if not any(row): continue
            code_comp  = col(row, 'composante')
            type_dipl  = col(row, 'type_diplome')
            dept_nom   = col(row, 'departement')
            ment_nom   = col(row, 'mention')
            parc_nom   = col(row, 'parcours')
            type_col   = col(row, 'type')
            fonction   = col(row, 'n')
            prenom     = col(row, 'prenom')
            nom_u      = col(row, 'nom')
            civilite   = col(row, 'civilite')
            cat_pers   = col(row, 'cat_personnel')
            mail_inst  = col(row, 'mail_inst').strip()
            mail_inst2 = col(row, 'mail_inst2').strip()
            mail_fonc  = col(row, 'mail_fonc').strip()
            bureau     = col(row, 'bureau')
            telephone  = col(row, 'telephone').strip()

            if not code_comp: continue
            if code_comp not in entite_comp: continue

            comp_eid = entite_comp[code_comp]
            current_eid = comp_eid

            # Département
            if dept_nom:
                dk = (code_comp, dept_nom.lower())
                if dk not in entite_dept:
                    entite_dept[dk] = get_entite('DEPARTEMENT', dept_nom, comp_eid)
                current_eid = entite_dept[dk]

            # Mention
            if ment_nom:
                mk = (code_comp, dept_nom.lower(), ment_nom.lower())
                if mk not in entite_ment:
                    ment_eid = get_entite('MENTION', ment_nom, current_eid)
                    entite_ment[mk] = ment_eid
                    # Stocker cycle et type_diplome pour cette mention
                    cycle = cycle_from_type(type_col, type_dipl)
                    td = get_td_id(type_dipl) if type_dipl else None
                    mention_meta[ment_eid] = {'cycle': cycle, 'td_id': td}
                current_eid = entite_ment[mk]

            # Parcours
            if parc_nom and parc_nom.lower() not in ('tronc commun',):
                pk = (code_comp, dept_nom.lower(), ment_nom.lower(), parc_nom.lower())
                if pk not in entite_parc:
                    entite_parc[pk] = get_entite('PARCOURS', parc_nom, current_eid)
                current_eid = entite_parc[pk]

            # Niveau
            if type_col and type_col.upper() not in ('L', 'M', 'ING'):
                nk = (code_comp, dept_nom.lower(), ment_nom.lower(), parc_nom.lower(), type_col.lower())
                if nk not in entite_niv:
                    entite_niv[nk] = get_entite('NIVEAU', type_col, current_eid)

            # Utilisateur
            if not prenom and not nom_u and not mail_inst: continue

            uid = get_user(
                prenom, nom_u,
                genre=genre_to_enum(civilite),
                categorie=categorie_to_enum(cat_pers),
                mail_inst=mail_inst or None,
                mail_inst2=mail_inst2 or None,
                tel=telephone or None,
                bureau=bureau or None,
            )

            role_id = map_role(fonction)
            add_aff(uid, role_id, current_eid, mail_fonc=mail_fonc or None)

    # ── 6. Génération SQL ─────────────────────────────────────────────────────

    # entite_structure — utilise entite_names pour les noms originaux
    lines.append(f'-- Entités ({len(entite_cache)} au total)')
    lines.append('INSERT INTO entite_structure (id_entite, id_annee, id_entite_parent, type_entite, nom) VALUES')
    ent_rows = []
    for (type_e, _nom_lower, parent_id), eid in sorted(entite_cache.items(), key=lambda x: x[1]):
        nom_original = entite_names[eid]
        ent_rows.append(
            f"  ({eid}, {ANNEE_ID}, {parent_id if parent_id else 'NULL'}, '{type_e}', {q(nom_original)})"
        )
    lines.append(',\n'.join(ent_rows) + ';')
    lines.append(f"SELECT setval(pg_get_serial_sequence('entite_structure','id_entite'), {next_entite[0]});")
    lines.append('')

    print(f'Utilisateurs : {len(user_data)}')
    print(f'Affectations : {len(affectations)}')
    print(f'Contact roles : {len(contact_roles)}')

    # composante sous-table
    if entite_comp:
        lines.append('INSERT INTO composante (id_entite, code_composante, type_composante, site_web, mail_fonctionnel, mail_institutionnel, campus) VALUES')
        cr = []
        for code, c in composantes.items():
            eid = entite_comp[code]
            ct = composante_type_from_nom(c['nom'], code)
            cr.append(f"  ({eid}, {q(code)}, '{ct}', NULL, {q(c['dir_mail_fonc'] or None)}, NULL, {q(c['campus'] or None)})")
        lines.append(',\n'.join(cr) + ';')
        lines.append('')

    # departement
    if entite_dept:
        lines.append('INSERT INTO departement (id_entite, code_interne) VALUES')
        lines.append(',\n'.join(f"  ({eid}, NULL)" for eid in entite_dept.values()) + ';')
        lines.append('')

    # mention — avec cycle et id_type_diplome
    if entite_ment:
        lines.append('INSERT INTO mention (id_entite, type_diplome, cycle, id_type_diplome) VALUES')
        ment_rows_sql = []
        for (code_comp, dept_l, ment_l), eid in entite_ment.items():
            meta = mention_meta.get(eid, {})
            cycle_val = meta.get('cycle')
            td_val = meta.get('td_id')
            ment_rows_sql.append(
                f"  ({eid}, NULL, {cycle_val if cycle_val else 'NULL'}, {td_val if td_val else 'NULL'})"
            )
        lines.append(',\n'.join(ment_rows_sql) + ';')
        lines.append('')

    # parcours
    if entite_parc:
        lines.append('INSERT INTO parcours (id_entite, code_parcours) VALUES')
        lines.append(',\n'.join(f"  ({eid}, NULL)" for eid in entite_parc.values()) + ';')
        lines.append('')

    # niveau
    if entite_niv:
        lines.append('INSERT INTO niveau (id_entite, libelle_court) VALUES')
        lines.append(',\n'.join(f"  ({eid}, NULL)" for eid in entite_niv.values()) + ';')
        lines.append('')

    # utilisateurs
    if user_data:
        lines.append('INSERT INTO utilisateur (id_user, login, nom, prenom, genre, categorie, email_institutionnel, email_institutionnel_secondaire, telephone, bureau, statut) VALUES')
        u_rows = []
        for uid, u in sorted(user_data.items()):
            genre_val = f"'{u['genre']}'::utilisateur_genre" if u['genre'] else 'NULL'
            cat_val   = f"'{u['categorie']}'::utilisateur_categorie" if u['categorie'] else 'NULL'
            u_rows.append(
                f"  ({uid}, {q(u['login'])}, {q(u['nom'])}, {q(u['prenom'])}, "
                f"{genre_val}, {cat_val}, "
                f"{q(u['mail_inst'])}, {q(u['mail_inst2'])}, "
                f"{q(u['tel'])}, {q(u['bureau'])}, 'ACTIF')"
            )
        lines.append(',\n'.join(u_rows) + ';')
        lines.append(f"SELECT setval(pg_get_serial_sequence('utilisateur','id_user'), {next_user[0]});")
        lines.append('')

    # affectations
    if affectations:
        lines.append('INSERT INTO affectation (id_affectation, id_user, id_role, id_entite, id_annee, date_debut) VALUES')
        a_rows = [
            f"  ({a['id']}, {a['uid']}, {q(a['role'])}, {a['entite']}, {a['annee']}, '2025-09-01')"
            for a in affectations
        ]
        lines.append(',\n'.join(a_rows) + ';')
        lines.append(f"SELECT setval(pg_get_serial_sequence('affectation','id_affectation'), {next_aff[0]});")
        lines.append('')

    # contact_role
    if contact_roles:
        lines.append('INSERT INTO contact_role (id_contact_role, id_affectation, email_fonctionnelle, type_email) VALUES')
        cr_rows = [
            f"  ({cr['id']}, {cr['aff_id']}, {q(cr['email'])}, {q(cr['type'])})"
            for cr in contact_roles
        ]
        lines.append(',\n'.join(cr_rows) + ';')
        lines.append(f"SELECT setval(pg_get_serial_sequence('contact_role','id_contact_role'), {next_cr[0]});")
        lines.append('')

    # Utilisateurs démo (services centraux)
    first_comp_eid = list(entite_comp.values())[0] if entite_comp else 2000
    demo_uid_start = next_user[0]
    lines += [
        '-- Utilisateurs de démo',
        f"INSERT INTO utilisateur (id_user, login, nom, prenom, statut) VALUES",
        f"  ({demo_uid_start}, 'sc.admin', 'Admin', 'Services', 'ACTIF'),",
        f"  ({demo_uid_start+1}, 'dsi.tech', 'Tech', 'DSI', 'ACTIF');",
        f"SELECT setval(pg_get_serial_sequence('utilisateur','id_user'), {demo_uid_start+2});",
        f"INSERT INTO affectation (id_user, id_role, id_entite, id_annee, date_debut) VALUES",
        f"  ({demo_uid_start}, 'services-centraux', {first_comp_eid}, {ANNEE_ID}, '2025-09-01'),",
        f"  ({demo_uid_start+1}, 'administrateur', {first_comp_eid}, {ANNEE_ID}, '2025-09-01');",
        '',
        'COMMIT;',
        '',
        "SELECT 'Seed terminé' as status,",
        "  (SELECT count(*) FROM composante) as composantes,",
        "  (SELECT count(*) FROM utilisateur) as utilisateurs,",
        "  (SELECT count(*) FROM affectation) as affectations;",
    ]

    OUT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'\nSQL écrit dans {OUT}')
    print(f'  Entités     : {len(entite_cache)}')
    print(f'  Utilisateurs: {len(user_data)}')
    print(f'  Affectations: {len(affectations)}')
    print(f'  Contact roles: {len(contact_roles)}')

if __name__ == '__main__':
    main()
