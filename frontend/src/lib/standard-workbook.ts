export const STANDARD_WORKBOOK_VERSION = "CGP_STANDARD_V1";

export const STANDARD_WORKBOOK_COLUMNS = {
  roles: [
    "id_role",
    "libelle",
    "description",
    "niveau_hierarchique",
    "is_global",
    "est_administratif",
    "est_transverse",
    "source_id_composante",
  ],
  structures: [
    "source_id_entite",
    "source_parent_id_entite",
    "type_entite",
    "nom",
    "tel_service",
    "bureau_service",
    "code_composante",
    "type_composante",
    "site_web",
    "mail_fonctionnel",
    "mail_institutionnel",
    "campus",
    "code_interne",
    "type_diplome",
    "diplome_libelle",
    "cycle",
    "code_parcours",
    "libelle_court",
  ],
  users: [
    "source_id_user",
    "login",
    "uid_cas",
    "nom",
    "prenom",
    "genre",
    "categorie",
    "email_institutionnel",
    "email_institutionnel_secondaire",
    "telephone",
    "bureau",
    "statut",
  ],
  affectations: [
    "source_id_affectation",
    "source_id_affectation_n_plus_1",
    "user_login",
    "id_role",
    "source_id_entite",
    "date_debut",
    "date_fin",
  ],
  contacts: [
    "source_id_contact_role",
    "source_id_affectation",
    "email_fonctionnelle",
    "type_email",
    "telephone",
    "bureau",
  ],
  delegations: [
    "source_id_delegation",
    "delegant_login",
    "delegataire_login",
    "source_id_entite",
    "id_role",
    "type_droit",
    "date_debut",
    "date_fin",
    "statut",
  ],
  signalements: [
    "source_id_signalement",
    "auteur_login",
    "traitant_login",
    "cloture_par_login",
    "user_cible_login",
    "source_id_entite_cible",
    "description",
    "type_signalement",
    "escalade_sc",
    "statut",
    "date_creation",
    "date_prise_en_charge",
    "date_traitement",
    "commentaire_prise_en_charge",
    "commentaire_cloture",
  ],
  organigrammes: [
    "source_id_organigramme",
    "source_id_entite_racine",
    "generated_by_login",
    "generated_at",
    "est_fige",
    "export_format",
    "visibility_scope",
  ],
} as const;

export type StandardWorkbookSheetName = keyof typeof STANDARD_WORKBOOK_COLUMNS;
export type StandardWorkbookRow = Record<string, string>;

export type StandardWorkbookPayload = {
  formatVersion: string;
  meta: Record<string, string>;
  sheets: Record<StandardWorkbookSheetName, StandardWorkbookRow[]>;
};

export type WorkbookSourceScope = {
  id: string;
  label: string;
  type: string;
};

const SPREADSHEET_NS = "urn:schemas-microsoft-com:office:spreadsheet";

function getAttributeNsAware(node: Element, localName: string) {
  return (
    node.getAttributeNS(SPREADSHEET_NS, localName) ||
    node.getAttribute(`ss:${localName}`) ||
    node.getAttribute(localName) ||
    ""
  );
}

function getChildElements(node: ParentNode, tagName: string) {
  return Array.from(node.childNodes).filter(
    (child): child is Element =>
      child.nodeType === Node.ELEMENT_NODE &&
      ((child as Element).localName || child.nodeName) === tagName,
  );
}

function readWorksheetRows(worksheet: Element) {
  const table = getChildElements(worksheet, "Table")[0];
  if (!table) return [];

  return getChildElements(table, "Row").map((row) => {
    const values: string[] = [];
    let currentIndex = 1;
    getChildElements(row, "Cell").forEach((cell) => {
      const rawIndex = getAttributeNsAware(cell, "Index");
      const explicitIndex = rawIndex ? Number(rawIndex) : null;
      if (explicitIndex && Number.isFinite(explicitIndex) && explicitIndex > currentIndex) {
        while (currentIndex < explicitIndex) {
          values.push("");
          currentIndex += 1;
        }
      }

      const dataCell = getChildElements(cell, "Data")[0];
      values.push(dataCell?.textContent?.trim() || "");
      currentIndex += 1;
    });
    return values;
  });
}

export function parseStandardWorkbookXml(content: string): StandardWorkbookPayload {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Le fichier Excel standardisé n'a pas pu être lu.");
  }

  const worksheets = Array.from(
    doc.getElementsByTagNameNS(SPREADSHEET_NS, "Worksheet"),
  );
  const meta: Record<string, string> = {};
  const sheets = Object.fromEntries(
    Object.keys(STANDARD_WORKBOOK_COLUMNS).map((sheetName) => [sheetName, []]),
  ) as Record<StandardWorkbookSheetName, StandardWorkbookRow[]>;

  worksheets.forEach((worksheet) => {
    const name = getAttributeNsAware(worksheet, "Name").toUpperCase();
    const rows = readWorksheetRows(worksheet);
    if (name === "META") {
      rows.slice(1).forEach((row) => {
        const [key, value] = row;
        if (key) {
          meta[key] = value || "";
        }
      });
      return;
    }

    const normalizedSheetName = name.toLowerCase() as StandardWorkbookSheetName;
    if (!(normalizedSheetName in STANDARD_WORKBOOK_COLUMNS)) {
      return;
    }

    const headers = rows[0] || [];
    sheets[normalizedSheetName] = rows.slice(1).map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index] || ""]),
      ),
    );
  });

  const formatVersion = meta.format_version || STANDARD_WORKBOOK_VERSION;
  if (formatVersion !== STANDARD_WORKBOOK_VERSION) {
    throw new Error(
      `Version de fichier non supportée (${formatVersion}). Version attendue: ${STANDARD_WORKBOOK_VERSION}.`,
    );
  }

  return {
    formatVersion,
    meta,
    sheets,
  };
}

export function getWorkbookSourceScopes(workbook: StandardWorkbookPayload): WorkbookSourceScope[] {
  return workbook.sheets.structures
    .map((row) => ({
      id: row.source_id_entite,
      label: `${row.nom || row.source_id_entite} (${row.type_entite || "Structure"})`,
      type: row.type_entite || "",
    }))
    .filter((row) => Boolean(row.id))
    .sort((left, right) => left.label.localeCompare(right.label, "fr", { sensitivity: "base" }));
}

export function downloadBase64File(
  contentBase64: string,
  fileName: string,
  mimeType: string,
) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
