import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { DirectorySearch } from "./components/DirectorySearch";
import { ManageResponsibles } from "./components/ManageResponsibles";
import { ManageRoles } from "./components/ManageRoles";
import { OrgChart } from "./components/OrgChart";
import { ImportExport } from "./components/ImportExport";
import { Delegations } from "./components/Delegations";
import { YearManagement } from "./components/YearManagement";
import { ErrorReports } from "./components/ErrorReports";
import { UserProfile } from "./components/UserProfile";
import {
  AcademicYear,
  EntiteStructure,
  User,
  UserRole,
  View,
  canManageDelegations,
  canManageYears,
  getRoleLabel,
} from "./types";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  GitBranch,
  LayoutDashboard,
  Menu,
  Search,
  Shield,
  User as UserIcon,
  UserCircle,
  Users,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch, clearStoredLogin, getStoredLogin, setStoredLogin } from "./lib/api";

type ApiYear = {
  id_annee: number;
  libelle: string;
  statut: "EN_COURS" | "PREPARATION" | "ARCHIVEE";
};

type ApiCurrentAffectation = {
  affectationId: string;
  roleId: string;
  roleLabel?: string | null;
  entiteId: string;
  entiteType?: EntiteStructure["type_entite"] | null;
  entiteName?: string | null;
  anneeId: string;
  anneeLabel?: string | null;
};

type ApiCurrentUser = {
  userId: string;
  login: string;
  nom: string;
  prenom: string;
  emailInstitutionnel?: string | null;
  affectations: ApiCurrentAffectation[];
};

type ApiAffectation = {
  id_affectation: number;
  id_role: string;
  id_entite: number;
  id_annee: number;
  niveau_hierarchique: number;
  entite_name?: string | null;
  entite_type?: EntiteStructure["type_entite"] | null;
  annee_label?: string | null;
};

type ApiMe = {
  user: ApiCurrentUser | null;
};

type NavItem = {
  id: View;
  label: string;
  icon: LucideIcon;
  isVisible: (role: UserRole) => boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Essentiel",
    items: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        isVisible: () => true,
      },
      {
        id: "search",
        label: "Rechercher",
        icon: Search,
        isVisible: () => true,
      },
      {
        id: "org-chart",
        label: "Organigramme",
        icon: GitBranch,
        isVisible: () => true,
      },
      {
        id: "import-export",
        label: "Import / Export",
        icon: Download,
        isVisible: () => true,
      },
    ],
  },
  {
    label: "Gestion",
    items: [
      {
        id: "manage-responsibles",
        label: "Responsables",
        icon: Users,
        isVisible: (role) => role !== "utilisateur-simple" && role !== "responsable-annee",
      },
      {
        id: "manage-roles",
        label: "Roles",
        icon: Shield,
        isVisible: (role) => role === "administrateur" || role === "services-centraux",
      },
      {
        id: "delegations",
        label: "Delegations",
        icon: UserCircle,
        isVisible: (role) => canManageDelegations(role),
      },
      {
        id: "year-management",
        label: "Annees",
        icon: Calendar,
        isVisible: (role) => canManageYears(role),
      },
      {
        id: "error-reports",
        label: "Signalements",
        icon: AlertTriangle,
        isVisible: () => true,
      },
    ],
  },
  {
    label: "Profil",
    items: [
      {
        id: "user-profile",
        label: "Ma fiche",
        icon: UserCircle,
        isVisible: () => true,
      },
    ],
  },
];

const mapYearStatus = (status: ApiYear["statut"]): AcademicYear["status"] => {
  if (status === "EN_COURS") return "en-cours";
  if (status === "PREPARATION") return "en-preparation";
  return "archivee";
};

const ROLE_HIERARCHY: Record<string, number> = {
  "administrateur": 0,
  "services-centraux": 0,
  "directeur-composante": 1,
  "directeur-administratif": 2,
  "directeur-administratif-adjoint": 3,
  "directeur-departement": 4,
  "directeur-mention": 5,
  "directeur-specialite": 6,
  "responsable-formation": 7,
  "responsable-annee": 8,
  "utilisateur-simple": 9,
  "lecture-seule": 99,
};

const normalizeAffectations = (affectations: ApiCurrentAffectation[]): ApiAffectation[] =>
  (affectations || []).map((aff) => ({
    id_affectation: Number.parseInt(aff.affectationId, 10) || 0,
    id_role: aff.roleId,
    id_entite: Number.parseInt(aff.entiteId, 10) || 0,
    id_annee: Number.parseInt(aff.anneeId, 10) || 0,
    niveau_hierarchique: ROLE_HIERARCHY[aff.roleId] ?? 999,
    entite_name: aff.entiteName ?? null,
    entite_type: aff.entiteType ?? null,
    annee_label: aff.anneeLabel ?? null,
  }));

const parseYearStart = (label?: string | null, fallback?: number) => {
  if (!label) return fallback;
  const match = label.match(/(\d{4})/);
  if (!match) return fallback;
  return Number.parseInt(match[1], 10);
};

const deriveYearsFromAffectations = (affectations: ApiAffectation[]): AcademicYear[] => {
  const map = new Map<number, { id: number; label: string; sortKey: number }>();

  affectations.forEach((aff) => {
    if (!aff.id_annee) return;
    const existing = map.get(aff.id_annee);
    if (existing) return;
    const label = aff.annee_label || String(aff.id_annee);
    const sortKey = parseYearStart(label, aff.id_annee) ?? aff.id_annee;
    map.set(aff.id_annee, { id: aff.id_annee, label, sortKey });
  });

  const years = Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  const activeId = years.length ? years[years.length - 1].id : null;

  return years.map((year) => ({
    id: String(year.id),
    year: year.label,
    status: year.id === activeId ? "en-cours" : "archivee",
    isFrozen: false,
  }));
};

const deriveEntitesFromAffectations = (
  affectations: ApiAffectation[],
  yearId?: string | null,
): EntiteStructure[] => {
  const map = new Map<number, EntiteStructure>();

  affectations.forEach((aff) => {
    if (yearId && String(aff.id_annee) !== String(yearId)) return;
    if (!aff.id_entite) return;
    if (map.has(aff.id_entite)) return;

    map.set(aff.id_entite, {
      id_entite: aff.id_entite,
      id_annee: aff.id_annee || 0,
      id_entite_parent: null,
      type_entite: aff.entite_type || "COMPOSANTE",
      nom: aff.entite_name || `Entite ${aff.id_entite}`,
      tel_service: null,
      bureau_service: null,
    });
  });

  return Array.from(map.values());
};

const buildEntiteMap = (entites: EntiteStructure[]) => {
  const map = new Map<number, EntiteStructure>();
  entites.forEach((entite) => map.set(entite.id_entite, entite));
  return map;
};

const resolveHierarchy = (
  entiteId: number,
  entiteMap: Map<number, EntiteStructure>,
) => {
  let current = entiteMap.get(entiteId);
  const result: Record<string, string> = {};
  while (current) {
    const type = current.type_entite.toLowerCase();
    if (!result[type]) {
      result[type] = current.nom;
    }
    if (!current.id_entite_parent) break;
    current = entiteMap.get(current.id_entite_parent);
  }
  return result;
};

const getTopRole = (affectations: ApiAffectation[]): UserRole => {
  if (!affectations.length) return "utilisateur-simple";
  const sorted = [...affectations].sort(
    (a, b) => (a.niveau_hierarchique ?? 999) - (b.niveau_hierarchique ?? 999),
  );
  return (sorted[0].id_role as UserRole) || "utilisateur-simple";
};

const buildUser = (
  apiUser: ApiCurrentUser,
  affectations: ApiAffectation[],
  entiteMap: Map<number, EntiteStructure>,
  years: AcademicYear[],
): User => {
  const yearMap = new Map(years.map((year) => [Number(year.id), year.year]));

  const roles = affectations.map((aff) => {
    const entite = entiteMap.get(aff.id_entite);
    return {
      roleId: aff.id_role,
      roleName: getRoleLabel(aff.id_role as UserRole) || aff.id_role,
      structure: entite?.nom || `Entite ${aff.id_entite}`,
      structureType: (entite?.type_entite?.toLowerCase() as
        | "composante"
        | "departement"
        | "mention"
        | "specialite"
        | "parcours") || "composante",
      entiteId: aff.id_entite,
      year: yearMap.get(aff.id_annee) || String(aff.id_annee),
      hierarchyLevel: aff.niveau_hierarchique ?? 0,
    };
  });

  const component = affectations.length
    ? resolveHierarchy(affectations[0].id_entite, entiteMap).composante
    : undefined;

  return {
    id: String(apiUser.userId),
    login: apiUser.login,
    name: `${apiUser.prenom} ${apiUser.nom}`,
    firstName: apiUser.prenom,
    lastName: apiUser.nom,
    role: getTopRole(affectations),
    email: apiUser.emailInstitutionnel || "",
    phone: undefined,
    office: undefined,
    component: component || undefined,
    roles,
  };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [entites, setEntites] = useState<EntiteStructure[]>([]);
  const [yearSelectorOpen, setYearSelectorOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authLogin, setAuthLogin] = useState<string | null>(getStoredLogin());
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSession = async (login: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const meData = await apiFetch<ApiMe>("/auth/me", { login });
      if (!meData.user) {
        throw new Error("Utilisateur introuvable");
      }

      const normalizedAffectations = normalizeAffectations(meData.user.affectations);

      let mappedYears: AcademicYear[] = [];
      try {
        const yearsData = await apiFetch<{ items: ApiYear[] }>("/years", { login });
        mappedYears = (yearsData.items || []).map((year) => ({
          id: String(year.id_annee),
          year: year.libelle,
          status: mapYearStatus(year.statut),
          isFrozen: false,
        }));
      } catch {
        mappedYears = deriveYearsFromAffectations(normalizedAffectations);
      }

      if (!mappedYears.length) {
        throw new Error("Aucune annee disponible pour cet utilisateur");
      }

      setAcademicYears(mappedYears);

      const yearToUse =
        mappedYears.find((year) => year.status === "en-cours") || mappedYears[0] || null;
      setCurrentYear(yearToUse);

      let entiteItems: EntiteStructure[] = [];
      if (yearToUse) {
        try {
          const entiteList = await apiFetch<{ items: EntiteStructure[] }>(
            `/entites?yearId=${yearToUse.id}`,
            { login },
          );
          entiteItems = entiteList.items || [];
        } catch {
          entiteItems = deriveEntitesFromAffectations(normalizedAffectations, yearToUse.id);
        }
      }
      setEntites(entiteItems);

      const entiteMap = buildEntiteMap(entiteItems);
      const user = buildUser(meData.user, normalizedAffectations, entiteMap, mappedYears);
      setCurrentUser(user);
      setStoredLogin(login);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible";
      setAuthError(message);
      clearStoredLogin();
      setCurrentUser(null);
      setAuthLogin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLogin) {
      loadSession(authLogin);
    }
  }, [authLogin]);

  const handleLogin = (login: string) => {
    setAuthLogin(login);
  };

  const handleLogout = () => {
    clearStoredLogin();
    setAuthLogin(null);
    setCurrentUser(null);
    setCurrentView("dashboard");
  };

  const visibleNavSections = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.isVisible(currentUser.role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentUser]);

  const handleNavigate = (view: View) => {
    setCurrentView(view);
    setMobileNavOpen(false);
  };

  const handleYearChange = async (year: AcademicYear) => {
    setCurrentYear(year);
    if (!authLogin) return;
    setLoading(true);
    try {
      const meData = await apiFetch<ApiMe>(`/auth/me?yearId=${year.id}`, { login: authLogin });
      if (!meData.user) {
        throw new Error("Utilisateur introuvable");
      }

      const normalizedAffectations = normalizeAffectations(meData.user.affectations);

      let entiteItems: EntiteStructure[] = [];
      try {
        const entiteList = await apiFetch<{ items: EntiteStructure[] }>(
          `/entites?yearId=${year.id}`,
          { login: authLogin },
        );
        entiteItems = entiteList.items || [];
      } catch {
        entiteItems = deriveEntitesFromAffectations(normalizedAffectations, year.id);
      }

      setEntites(entiteItems);
      const entiteMap = buildEntiteMap(entiteItems);
      const user = buildUser(meData.user, normalizedAffectations, entiteMap, academicYears);
      setCurrentUser(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de chargement";
      setAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshYears = async () => {
    if (!authLogin) return;
    try {
      const yearsData = await apiFetch<{ items: ApiYear[] }>("/years", { login: authLogin });
      const mappedYears = yearsData.items.map((year) => ({
        id: String(year.id_annee),
        year: year.libelle,
        status: mapYearStatus(year.statut),
        isFrozen: false,
      }));
      setAcademicYears(mappedYears);
      if (!currentYear || !mappedYears.find((year) => year.id === currentYear.id)) {
        const fallback =
          mappedYears.find((year) => year.status === "en-cours") || mappedYears[0] || null;
        setCurrentYear(fallback);
      }
    } catch {
      // Keep current years when endpoint is not available.
    }
  };

  const handleUserUpdate = (updates: Partial<User>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  if (!currentUser || !currentYear) {
    return <Login onLogin={handleLogin} error={authError} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="text-slate-900 font-semibold">Annuaire des Formations</div>
                <div className="text-xs text-slate-500">USPN • Repertoire des responsables</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setYearSelectorOpen(!yearSelectorOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-200"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{currentYear.year}</span>
                  <span className="text-xs bg-indigo-200 px-2 py-0.5 rounded">
                    {currentYear.status === "en-cours"
                      ? "En cours"
                      : currentYear.status === "en-preparation"
                      ? "Preparation"
                      : "Archivee"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {yearSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setYearSelectorOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                      <div className="p-2">
                        <div className="text-xs text-slate-500 px-3 py-2 font-medium">
                          Selectionner une annee
                        </div>
                        {academicYears.map((year) => (
                          <button
                            key={year.id}
                            onClick={() => {
                              handleYearChange(year);
                              setYearSelectorOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                              currentYear.id === year.id
                                ? "bg-indigo-50 text-indigo-700"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{year.year}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  year.status === "en-cours"
                                    ? "bg-green-100 text-green-700"
                                    : year.status === "en-preparation"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {year.status === "en-cours"
                                  ? "En cours"
                                  : year.status === "en-preparation"
                                  ? "Preparation"
                                  : "Archivee"}
                              </span>
                            </div>
                            {year.isFrozen && (
                              <div className="text-xs text-slate-500 mt-1">Organigramme fige</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-slate-900 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-500" />
                    {currentUser.name}
                  </div>
                  <div className="text-slate-500 text-sm">{getRoleLabel(currentUser.role)}</div>
                  {currentUser.component && (
                    <div className="text-slate-400 text-xs">{currentUser.component}</div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Deconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <aside className="hidden lg:flex w-72 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-full flex-col gap-6 p-4 overflow-y-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-6">
              {visibleNavSections.map((section) => (
                <div key={section.label} className="space-y-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <SidebarButton
                        key={item.id}
                        active={currentView === item.id}
                        icon={item.icon}
                        onClick={() => handleNavigate(item.id)}
                      >
                        {item.label}
                      </SidebarButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Utilisateur connecte</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
                  <div className="text-xs text-slate-500">{getRoleLabel(currentUser.role)}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Deconnexion
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6">
          <div className="mx-auto max-w-6xl">
            {currentView === "dashboard" && (
              <Dashboard user={currentUser} currentYear={currentYear} onNavigate={setCurrentView} />
            )}
            {currentView === "search" && (
              <DirectorySearch
                currentYear={currentYear}
                entites={entites}
                authLogin={authLogin}
              />
            )}
            {currentView === "user-profile" && (
              <UserProfile
                user={currentUser}
                currentYear={currentYear}
                authLogin={authLogin}
                onUserUpdate={handleUserUpdate}
              />
            )}
            {currentView === "manage-responsibles" && (
              <ManageResponsibles
                userRole={currentUser.role}
                currentYear={currentYear}
                entites={entites}
                authLogin={authLogin}
              />
            )}
            {currentView === "manage-roles" && (
              <ManageRoles currentYear={currentYear} authLogin={authLogin} />
            )}
            {currentView === "org-chart" && (
              <OrgChart
                userRole={currentUser.role}
                currentYear={currentYear}
                authLogin={authLogin}
                entites={entites}
                currentUser={currentUser}
              />
            )}
            {currentView === "import-export" && (
              <ImportExport
                userRole={currentUser.role}
                currentYear={currentYear}
                authLogin={authLogin}
              />
            )}
            {currentView === "delegations" && (
              <Delegations
                userRole={currentUser.role}
                currentYear={currentYear}
                authLogin={authLogin}
                currentUserId={currentUser.id}
                entites={entites}
              />
            )}
            {currentView === "year-management" && (
              <YearManagement
                currentYear={currentYear}
                authLogin={authLogin}
                onRefresh={refreshYears}
              />
            )}
            {currentView === "error-reports" && (
              <ErrorReports
                userRole={currentUser.role}
                currentYear={currentYear}
                authLogin={authLogin}
                entites={entites}
                currentUserId={currentUser.id}
              />
            )}
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl border-r border-slate-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Navigation</div>
                <div className="text-xs text-slate-500">Acces rapide</div>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700"
                onClick={() => setMobileNavOpen(false)}
              >
                Fermer
              </button>
            </div>
            <div className="space-y-6">
              {visibleNavSections.map((section) => (
                <div key={section.label} className="space-y-2">
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <SidebarButton
                        key={item.id}
                        active={currentView === item.id}
                        icon={item.icon}
                        onClick={() => handleNavigate(item.id)}
                      >
                        {item.label}
                      </SidebarButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: LucideIcon;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </button>
  );
}
