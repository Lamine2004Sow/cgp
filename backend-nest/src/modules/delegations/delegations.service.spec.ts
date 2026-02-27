import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DelegationsService } from './delegations.service';

const mockPrisma = {
  delegation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  affectation: {
    findFirst: jest.fn(),
  },
};

const userServicesCentraux = {
  userId: '1',
  login: 'admin',
  affectations: [{ roleId: 'services-centraux', entiteId: '10', anneeId: '100' }],
};

const userDirecteur = {
  userId: '2',
  login: 'directeur',
  affectations: [{ roleId: 'directeur-composante', entiteId: '10', anneeId: '100' }],
};

describe('DelegationsService.create', () => {
  let service: DelegationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DelegationsService(mockPrisma as any);
  });

  const payload = {
    delegataire_id: 3,
    id_entite: 10,
    type_droit: 'lecture',
    date_debut: '2024-09-01',
  };

  const createdRow = {
    id_delegation: 1n,
    delegant_id: 2n,
    delegataire_id: 3n,
    id_entite: 10n,
    id_role: null,
    type_droit: 'lecture',
    date_debut: new Date('2024-09-01'),
    date_fin: null,
    statut: 'ACTIVE',
    utilisateur_delegation_delegant_idToutilisateur: { nom: 'Dupont' },
    utilisateur_delegation_delegataire_idToutilisateur: { nom: 'Martin' },
    entite_structure: { nom: 'UFR Sciences' },
  };

  it('crée une délégation si le délégant a une affectation sur l'entité', async () => {
    mockPrisma.affectation.findFirst.mockResolvedValue({ id_affectation: 1n });
    mockPrisma.delegation.create.mockResolvedValue({ id_delegation: 1n });
    mockPrisma.delegation.findUnique.mockResolvedValue(createdRow);

    const result = await service.create('2', payload, userDirecteur as any);
    expect(result.id_delegation).toBe(1);
    expect(mockPrisma.affectation.findFirst).toHaveBeenCalledWith({
      where: { id_user: 2n, id_entite: 10n },
    });
  });

  it('lève ForbiddenException si le délégant n'a pas d'affectation sur l'entité', async () => {
    mockPrisma.affectation.findFirst.mockResolvedValue(null);

    await expect(service.create('2', payload, userDirecteur as any)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPrisma.delegation.create).not.toHaveBeenCalled();
  });

  it('services_centraux peut déléguer sans affectation directe', async () => {
    mockPrisma.delegation.create.mockResolvedValue({ id_delegation: 1n });
    mockPrisma.delegation.findUnique.mockResolvedValue(createdRow);

    const result = await service.create('1', payload, userServicesCentraux as any);
    expect(result.id_delegation).toBe(1);
    // Pas de vérification d'affectation pour services_centraux
    expect(mockPrisma.affectation.findFirst).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si délégant == délégaire', async () => {
    await expect(
      service.create('3', { ...payload, delegataire_id: 3 }, userDirecteur as any),
    ).rejects.toThrow(BadRequestException);
  });
});
