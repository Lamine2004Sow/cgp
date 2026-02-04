import { User, View, AcademicYear, canManageDelegations, canManageYears } from '../types';
import { Search, Users, Shield, GitBranch, Download, Upload, BarChart3, UserCog, Calendar as CalendarIcon, AlertTriangle, UserCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  currentYear: AcademicYear;
  onNavigate: (view: View) => void;
}

export function Dashboard({ user, currentYear, onNavigate }: DashboardProps) {
  const cards = [
    {
      title: 'Consulter l\'annuaire',
      description: 'Rechercher et consulter les formations et responsables',
      icon: Search,
      color: 'bg-blue-500',
      view: 'search' as View,
      available: true
    },
    {
      title: 'Ma fiche personnelle',
      description: 'Consulter et modifier ma fiche (téléphone, bureau)',
      icon: UserCircle,
      color: 'bg-teal-500',
      view: 'user-profile' as View,
      available: true
    },
    {
      title: 'Gérer les responsables',
      description: 'Modifier les fiches des responsables de formation',
      icon: Users,
      color: 'bg-green-500',
      view: 'manage-responsibles' as View,
      available: user.role !== 'utilisateur-simple' && user.role !== 'responsable-annee'
    },
    {
      title: 'Droits et rôles',
      description: 'Administrer les permissions et rôles (préétablis + demandes)',
      icon: Shield,
      color: 'bg-purple-500',
      view: 'manage-roles' as View,
      available: user.role === 'administrateur'
    },
    {
      title: 'Organigramme',
      description: 'Visualiser, générer et exporter les organigrammes',
      icon: GitBranch,
      color: 'bg-orange-500',
      view: 'org-chart' as View,
      available: true
    },
    {
      title: 'Import/Export',
      description: 'Importer Excel, exporter organigrammes PDF, requêtes filtrées',
      icon: Upload,
      color: 'bg-indigo-500',
      view: 'import-export' as View,
      available: true
    },
    {
      title: 'Délégations',
      description: 'Créer et consulter les délégations de droits',
      icon: UserCog,
      color: 'bg-cyan-500',
      view: 'delegations' as View,
      available: canManageDelegations(user.role)
    },
    {
      title: 'Gestion des années',
      description: 'Figer, ouvrir années suivantes, définir gouvernance',
      icon: CalendarIcon,
      color: 'bg-violet-500',
      view: 'year-management' as View,
      available: canManageYears(user.role)
    },
    {
      title: 'Signalements',
      description: 'Signaler ou traiter des erreurs dans l\'annuaire',
      icon: AlertTriangle,
      color: 'bg-orange-600',
      view: 'error-reports' as View,
      available: true
    }
  ];

  const stats = [
    { label: 'Formations', value: '142', icon: BarChart3, color: 'text-blue-600' },
    { label: 'Responsables', value: '87', icon: Users, color: 'text-green-600' },
    { label: 'Départements', value: '12', icon: GitBranch, color: 'text-orange-600' },
    { label: 'UFR/Composantes', value: '8', icon: Shield, color: 'text-purple-600' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-slate-900 mb-2">Bienvenue, {user.name}</h2>
        <p className="text-slate-600">
          Tableau de bord de l'annuaire des formations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
                <p className={`text-3xl ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-slate-900 mb-4">Fonctionnalités disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.filter(card => card.available).map((card) => (
            <button
              key={card.title}
              onClick={() => onNavigate(card.view)}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all text-left group"
            >
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-slate-900 mb-2">{card.title}</h4>
              <p className="text-slate-600 text-sm">{card.description}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}