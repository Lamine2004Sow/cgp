import { RolesService } from './roles.service';

const mockRole = {
  id_role: 'directeur-composante',
  libelle: 'Directeur de Composante',
  description: null,
  niveau_hierarchique: 1,
  is_global: true,
  id_composante: null,
};

const mockPrisma = {
  role: {
    findMany: jest.fn(),
  },
  demande_role: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  affectation: {
    findFirst: jest.fn(),
  },
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RolesService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('retourne un tableau de RoleResponseDto au format camelCase', async () => {
      mockPrisma.role.findMany.mockResolvedValue([mockRole]);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'directeur-composante',
        libelle: 'Directeur de Composante',
        niveauHierarchique: 1,
        isGlobal: true,
        idComposante: null,
      });
      // Vérifier que les clés snake_case ne sont PAS présentes
      expect(result[0]).not.toHaveProperty('id_role');
      expect(result[0]).not.toHaveProperty('niveau_hierarchique');
      expect(result[0]).not.toHaveProperty('is_global');
    });

    it('trie par niveau_hierarchique ascending', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { ...mockRole, id_role: 'role-b', niveau_hierarchique: 5 },
        { ...mockRole, id_role: 'role-a', niveau_hierarchique: 1 },
      ]);

      const result = await service.findAll();
      // findMany reçoit orderBy: { niveau_hierarchique: 'asc' }
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        orderBy: { niveau_hierarchique: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
