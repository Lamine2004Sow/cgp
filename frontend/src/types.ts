export type UserRole = 
  | 'directeur-composante' 
  | 'directeur-administratif' 
  | 'directeur-administratif-adjoint'
  | 'directeur-departement' 
  | 'directeur-mention'
  | 'directeur-specialite'
  | 'responsable-formation' 
  | 'responsable-annee'
  | 'utilisateur-simple' 
  | 'lecture-seule'
  | 'administrateur'
  | 'services-centraux';

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
}

export interface User {
  id: string;
  login?: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
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
  | 'manage-roles' 
  | 'org-chart' 
  | 'import-export'
  | 'delegations'
  | 'year-management'
  | 'error-reports'
  | 'user-profile';

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    'directeur-composante': 'Directeur de Composante/UFR',
    'directeur-administratif': 'Directeur Administratif (DA)',
    'directeur-administratif-adjoint': 'DA Adjoint(e)',
    'directeur-departement': 'Chef de Département',
    'directeur-mention': 'Directeur de Mention',
    'directeur-specialite': 'Directeur de Spécialité',
    'responsable-formation': 'Responsable de Formation',
    'responsable-annee': 'Responsable d\'Année',
    'utilisateur-simple': 'Enseignant',
    'lecture-seule': 'Lecture seule',
    'administrateur': 'Administrateur / DSI',
    'services-centraux': 'Services Centraux'
  };
  return labels[role];
}

export function getAcademicYearStatusLabel(status: AcademicYearStatus): string {
  const labels: Record<AcademicYearStatus, string> = {
    'en-cours': 'En cours',
    'en-preparation': 'En préparation',
    'archivee': 'Archivée'
  };
  return labels[status];
}

export function canGenerateOrgChart(role: UserRole): boolean {
  // Seuls les rôles à partir de directeur de spécialité/mention peuvent générer
  const allowedRoles: UserRole[] = [
    'directeur-composante',
    'directeur-administratif',
    'directeur-administratif-adjoint',
    'directeur-departement',
    'directeur-mention',
    'directeur-specialite',
    'responsable-formation',
    'responsable-annee',
    'administrateur',
    'services-centraux'
  ];
  return allowedRoles.includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  const allowedRoles: UserRole[] = [
    'directeur-composante',
    'directeur-administratif',
    'directeur-administratif-adjoint',
    'administrateur',
    'services-centraux'
  ];
  return allowedRoles.includes(role);
}

export function canDeleteUser(role: UserRole): boolean {
  // Seul le directeur de composante peut supprimer
  return role === 'directeur-composante';
}

export function canImportData(role: UserRole): boolean {
  const allowedRoles: UserRole[] = [
    'directeur-composante',
    'directeur-administratif',
    'administrateur',
    'services-centraux'
  ];
  return allowedRoles.includes(role);
}

export function canManageDelegations(role: UserRole): boolean {
  const allowedRoles: UserRole[] = [
    'directeur-composante',
    'directeur-administratif',
    'administrateur',
    'services-centraux'
  ];
  return allowedRoles.includes(role);
}

export function canManageYears(role: UserRole): boolean {
  return role === 'services-centraux' || role === 'administrateur';
}

export function canAccessFilteredQueries(role: UserRole): boolean {
  return role === 'services-centraux' || role === 'administrateur';
}
