import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

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
  @IsIn(SIGNALEMENT_TYPES)
  type_signalement?: SignalementType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_entite_cible?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_user_cible?: number | null;
}
