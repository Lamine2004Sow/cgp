import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export const SIGNALEMENT_TYPES = [
  'ERREUR_INFO_PERSONNE',
  'MAUVAISE_AFFECTATION',
  'ERREUR_STRUCTURE',
  'ERREUR_MENTION',
  'AUTRE',
] as const;

export type SignalementType = (typeof SIGNALEMENT_TYPES)[number];

export class CreateSignalementDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  type_signalement?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_entite_cible?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_user_cible?: number | null;
}
