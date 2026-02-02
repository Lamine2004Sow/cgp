import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

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

  @IsString()
  type_droit!: string;

  @IsDateString()
  date_debut!: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;
}
