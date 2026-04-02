export type UserRole =
  | 'services-centraux'
  | 'administrateur'
  | 'directeur-composante'
  | 'directeur-administratif'
  | 'directeur-administratif-adjoint'
  | 'directeur-departement'
  | 'vice-president-departement'
  | 'directeur-adjoint-licence'
  | 'responsable-service-pedagogique'
  | 'responsable-adjoint-service-pedagogique'
  | 'directeur-mention'
  | 'directeur-specialite'
  | 'responsable-formation'
  | 'responsable-annee'
  | 'directeur-etudes'
  | 'responsable-qualite'
  | 'responsable-international'
  | 'referent-commun'
  | 'directeur-adjoint-ecole'
  | 'secretariat-pedagogique'
  | 'utilisateur-simple'
  | 'lecture-seule';

export type AcademicYearStatus = 'en-cours' | 'en-preparation' | 'archivee';

export interface AcademicYear {
  id: string;
  year: string; // ex: "2024-2025"
  status: AcademicYearStatus;
  isFrozen: boolean;
}

export interface EntiteStructure {
  id_entite: number;
  id_annee: number;
  id_entite_parent: number | null;
  type_entite: 'COMPOSANTE' | 'DEPARTEMENT' | 'MENTION' | 'PARCOURS' | 'NIVEAU';
  nom: string;
  tel_service?: string | null;
  bureau_service?: string | null;
  /** Code métier de la composante (ex. "903") — présent uniquement pour type COMPOSANTE */
  code_composante?: string | null;
}

/** Personne affectée sur une structure (responsable ou secrétariat) */
export interface AffectationPerson {
  id_affectation: number;
  id_user: number;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  id_role: string;
  role_libelle: string;
  is_responsable: boolean;
  contact?: {
    id_contact_role: number;
    email_fonctionnelle: string | null;
    telephone: string | null;
    bureau: string | null;
  } | null;
}

/** Fiche structure complète (détail + champs selon type + effectifs) */
export interface EntiteStructureDetail extends EntiteStructure {
  site_web?: string | null;
  code_composante?: string | null;
  type_composante?: string | null;
  mail_fonctionnel?: string | null;
  mail_institutionnel?: string | null;
  campus?: string | null;
  code_interne?: string | null;
  type_diplome?: string | null;
  code_parcours?: string | null;
  libelle_court?: string | null;
  responsables: AffectationPerson[];
  secretariat: AffectationPerson[];
  nombre_sous_responsables: number;
  nombre_delegations: number;
  nombre_signalements: number;
}

export interface User {
  id: string;
  login?: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
  secondaryEmail?: string;
  genre?: string;
  category?: string;
  phone?: string;
  office?: string;
  component?: string; // Composante
  roles: UserRoleAssignment[]; // Multi-rôles
}

export interface UserRoleAssignment {
  roleId: string;
  roleName: string;
  structure: string; // Structure/entité (département, mention, spécialité)
  structureType: 'composante' | 'departement' | 'mention' | 'specialite' | 'parcours';
  entiteId: number;
  year: string; // Année universitaire
  functionalEmail?: string; // Email fonctionnel lié au rôle
  hierarchyLevel: number; // Niveau hiérarchique (1 = directeur composante, etc.)
}

export interface PredefinedRole {
  id: string;
  name: string;
  hierarchyLevel: number;
  isGlobal: boolean; // true si commun à toutes les composantes
  description: string;
}

export interface ComponentSpecificRoleRequest {
  id: string;
  componentName: string;
  proposedRoleName: string;
  description: string;
  requestedBy: string;
  requestDate: string;
  status: 'en-attente' | 'validee' | 'refusee';
  reviewedBy?: string;
  reviewDate?: string;
  reviewComment?: string;
}

export interface Delegation {
  id: string;
  delegatorId: string; // Qui délègue
  delegatorName: string;
  delegateeId: string; // À qui
  delegateeName: string;
  scope: string; // Périmètre (structure)
  rights: string[]; // Droits délégués
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface ErrorReport {
  id: string;
  reportedBy: string;
  reportedById: string;
  errorType: 'nom' | 'prenom' | 'telephone' | 'bureau' | 'email' | 'role' | 'autre';
  description: string;
  concernedUserId?: string;
  concernedUserName?: string;
  reportDate: string;
  status: 'en-attente' | 'en-cours' | 'corrigee' | 'refusee';
  handledBy?: string;
  handledDate?: string;
  resolutionComment?: string;
}

export interface ResponsiblePerson {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  secondaryEmail?: string;
  genre?: string;
  category?: string;
  role: string;
  department: string;
  component: string;
  phone?: string;
  office?: string;
  formations: string[];
  functionalEmails?: { role: string; email: string }[];
  year: string;
}

export interface Formation {
  id: string;
  level: 'licence' | 'master' | 'doctorat' | 'DUT' | 'autre'; // Formation générale
  mention: string; // ex: "Droit", "Informatique"
  parcours?: string; // ex: "Droit privé", "Droit public"
  component: string; // Composante
  year: string;
  hierarchy: FormationHierarchy;
}

export interface FormationHierarchy {
  composante: string;
  departement?: string;
  mention?: string;
  specialite?: string;
  parcours?: string;
}

export interface OrgChartData {
  id: string;
  structure: string;
  structureType: 'composante' | 'departement' | 'mention' | 'specialite';
  year: string;
  isGenerated: boolean;
  isFrozen: boolean;
  generatedBy?: string;
  generatedDate?: string;
  lastExportDate?: string;
  data: OrgChartNode;
}

export interface OrgChartNode {
  id: string;
  name: string;
  role: string;
  email?: string;
  functionalEmail?: string;
  phone?: string;
  children?: OrgChartNode[];
}

export type View =
  | 'dashboard'
  | 'search'
  | 'manage-responsibles'
  | 'manage-structures'
  | 'manage-roles'
  | 'audit-logs'
  | 'org-chart'
  | 'import-export'
  | 'delegations'
  | 'year-management'
  | 'error-reports'
  | 'user-profile';

const ROLE_LABELS: Record<UserRole, string> = {
  'services-centraux': 'Services Centraux',
  'administrateur': 'Administrateur / DSI',
  'directeur-composante': 'Directeur de Composante/UFR',
  'directeur-administratif': 'Directeur Administratif (DA)',
  'directeur-administratif-adjoint': 'DA Adjoint(e)',
  'directeur-departement': 'Chef de Département',
  'vice-president-departement': 'Vice-Président de Département',
  'directeur-adjoint-licence': 'Directeur Adjoint Licence',
  'responsable-service-pedagogique': 'Responsable Service Pédagogique',
  'responsable-adjoint-service-pedagogique': 'Responsable Adjoint Service Pédagogique',
  'directeur-mention': 'Directeur de Mention',
  'directeur-specialite': 'Directeur de Spécialité',
  'responsable-formation': 'Responsable de Formation',
  'responsable-annee': "Responsable d'Année",
  'directeur-etudes': 'Directeur des Études',
  'responsable-qualite': 'Responsable Qualité',
  'responsable-international': 'Responsable International',
  'referent-commun': 'Référent Commun',
  'directeur-adjoint-ecole': "Directeur Adjoint d'École",
  'secretariat-pedagogique': 'Secrétariat Pédagogique',
  'utilisateur-simple': 'Enseignant',
  'lecture-seule': 'Lecture seule',
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

/** Libellé affichable pour un id_role (connu ou personnalisé). */
export function getRoleLabelSafe(roleId: string): string {
  return ROLE_LABELS[roleId as UserRole] ?? roleId;
}

export function getAcademicYearStatusLabel(status: AcademicYearStatus): string {
  const labels: Record<AcademicYearStatus, string> = {
    'en-cours': 'En cours',
    'en-preparation': 'En préparation',
    'archivee': 'Archivée'
  };
  return labels[status];
}

/** Rôles considérés comme "direction" (peuvent générer, gérer, déléguer) */
const DIRECTION_ROLES: UserRole[] = [
  'services-centraux',
  'administrateur',
  'directeur-composante',
  'directeur-administratif',
  'directeur-administratif-adjoint',
  'directeur-departement',
  'vice-president-departement',
  'directeur-adjoint-licence',
  'responsable-service-pedagogique',
  'responsable-adjoint-service-pedagogique',
  'directeur-mention',
  'directeur-specialite',
  'responsable-formation',
  'responsable-annee',
  'directeur-etudes',
];

export function canGenerateOrgChart(role: UserRole): boolean {
  return DIRECTION_ROLES.includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return [
    'services-centraux',
    'directeur-composante',
    'directeur-administratif',
    'directeur-administratif-adjoint',
  ].includes(role);
}

export function canDeleteUser(role: UserRole): boolean {
  return role === 'services-centraux' || role === 'directeur-composante';
}

export function canImportData(role: UserRole): boolean {
  return [
    'services-centraux',
    'directeur-composante',
    'directeur-administratif',
    'directeur-administratif-adjoint',
  ].includes(role);
}

export function canManageDelegations(role: UserRole): boolean {
  return DIRECTION_ROLES.includes(role);
}

export function canManageYears(role: UserRole): boolean {
  return role === 'services-centraux';
}

/** Fiches structures : consultation pour tous, modification par Services centraux uniquement */
export function canManageStructures(role: UserRole): boolean {
  return role === 'services-centraux';
}

export function canAccessFilteredQueries(role: UserRole): boolean {
  return role === 'services-centraux';
}

export function canReviewRoleRequests(role: UserRole): boolean {
  return role === 'services-centraux';
}

export function canRequestCustomRole(role: UserRole): boolean {
  return DIRECTION_ROLES.includes(role) && role !== 'services-centraux' && role !== 'administrateur';
}
