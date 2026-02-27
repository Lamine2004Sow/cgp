import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AffectationsService } from './affectations.service';

const mockPrisma = {
  affectation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('AffectationsService', () => {
  let service: AffectationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AffectationsService(mockPrisma as any);
  });

  describe('create', () => {
    const base = {
      id_user: 1,
      id_role: 'directeur-composante',
      id_entite: 10,
      id_annee: 100,
      date_debut: '2024-09-01',
    };

    it('crée une affectation valide', async () => {
      const row = {
        id_affectation: 1n,
        id_user: 1n,
        id_role: 'directeur-composante',
        id_entite: 10n,
        id_annee: 100n,
        date_debut: new Date('2024-09-01'),
        date_fin: null,
      };
      mockPrisma.affectation.create.mockResolvedValue(row);

      const result = await service.create(base);
      expect(result.id_affectation).toBe(1);
      expect(result.id_role).toBe('directeur-composante');
      expect(mockPrisma.affectation.create).toHaveBeenCalledTimes(1);
    });

    it('rejette date_fin < date_debut', async () => {
      await expect(
        service.create({ ...base, date_fin: '2023-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.affectation.create).not.toHaveBeenCalled();
    });

    it('accepte date_fin == date_debut', async () => {
      const row = {
        id_affectation: 2n,
        id_user: 1n,
        id_role: 'directeur-composante',
        id_entite: 10n,
        id_annee: 100n,
        date_debut: new Date('2024-09-01'),
        date_fin: new Date('2024-09-01'),
      };
      mockPrisma.affectation.create.mockResolvedValue(row);
      const result = await service.create({ ...base, date_fin: '2024-09-01' });
      expect(result.date_fin).toBe('2024-09-01');
    });
  });

  describe('findOne', () => {
    it('retourne une affectation existante', async () => {
      const row = {
        id_affectation: 5n,
        id_user: 1n,
        id_role: 'directeur-composante',
        id_entite: 10n,
        id_annee: 100n,
        date_debut: new Date('2024-09-01'),
        date_fin: null,
      };
      mockPrisma.affectation.findUnique.mockResolvedValue(row);
      const result = await service.findOne('5');
      expect(result.id_affectation).toBe(5);
    });

    it('lève NotFoundException si introuvable', async () => {
      mockPrisma.affectation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si ID invalide', async () => {
      await expect(service.findOne('abc')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = {
      id_affectation: 5n,
      id_user: 1n,
      id_role: 'directeur-composante',
      id_entite: 10n,
      id_annee: 100n,
      date_debut: new Date('2024-09-01'),
      date_fin: null,
    };

    it('met à jour la date_fin', async () => {
      mockPrisma.affectation.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, date_fin: new Date('2025-06-30') };
      mockPrisma.affectation.update.mockResolvedValue(updated);

      const result = await service.update('5', { date_fin: '2025-06-30' });
      expect(result.date_fin).toBe('2025-06-30');
    });

    it('rejette date_fin < date_debut existante', async () => {
      mockPrisma.affectation.findUnique.mockResolvedValue(existing);
      await expect(
        service.update('5', { date_fin: '2023-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si affectation inconnue', async () => {
      mockPrisma.affectation.findUnique.mockResolvedValue(null);
      await expect(service.update('999', { date_fin: '2025-06-30' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('supprime une affectation existante', async () => {
      const row = {
        id_affectation: 5n,
        id_user: 1n,
        id_role: 'directeur-composante',
        id_entite: 10n,
        id_annee: 100n,
        date_debut: new Date('2024-09-01'),
        date_fin: null,
      };
      mockPrisma.affectation.findUnique.mockResolvedValue(row);
      mockPrisma.affectation.delete.mockResolvedValue(row);

      await expect(service.remove('5')).resolves.toBeUndefined();
      expect(mockPrisma.affectation.delete).toHaveBeenCalledWith({
        where: { id_affectation: 5n },
      });
    });

    it('lève NotFoundException si introuvable', async () => {
      mockPrisma.affectation.findUnique.mockResolvedValue(null);
      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
