import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const mockPrisma = {
  utilisateur: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService.remove (soft delete)', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(mockPrisma as any);
  });

  it('met le statut à INACTIF sans supprimer physiquement', async () => {
    const user = { id_user: 1n, login: 'test', nom: 'A', prenom: 'B', statut: 'ACTIF' };
    mockPrisma.utilisateur.findUnique.mockResolvedValue(user);
    mockPrisma.utilisateur.update.mockResolvedValue({ ...user, statut: 'INACTIF' });

    await service.remove('1');

    expect(mockPrisma.utilisateur.update).toHaveBeenCalledWith({
      where: { id_user: 1n },
      data: { statut: 'INACTIF' },
    });
    // Pas de suppression physique
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('lève NotFoundException si utilisateur inexistant ou déjà inactif', async () => {
    mockPrisma.utilisateur.findUnique.mockResolvedValue(null);
    await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.utilisateur.update).not.toHaveBeenCalled();
  });

  it('lève NotFoundException si ID invalide', async () => {
    await expect(service.remove('abc')).rejects.toThrow(NotFoundException);
  });
});
