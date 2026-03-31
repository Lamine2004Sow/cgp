import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export const TYPE_DROIT_VALUES = [
  'view',
  'manage_responsables',
  'assign_role',
  'validate_signalement',
  'generate_orgchart',
  'import_data',
  'full',
] as const;

export type TypeDroit = (typeof TYPE_DROIT_VALUES)[number];

export class CreateDelegationDto {
  @Type(() => Number)
  @IsInt()
  delegataire_id!: number;

  @Type(() => Number)
  @IsInt()
  id_entite!: number;

  @IsOptional()
  @IsString()
  id_role?: string | null;

  @IsIn(TYPE_DROIT_VALUES, {
    message: `type_droit doit être l'une des valeurs : ${TYPE_DROIT_VALUES.join(', ')}`,
  })
  type_droit!: TypeDroit;

  @IsDateString()
  date_debut!: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;
}
