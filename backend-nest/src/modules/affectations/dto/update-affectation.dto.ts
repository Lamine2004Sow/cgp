import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateAffectationDto {
  @IsOptional()
  @IsString()
  id_role?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;

  /** Identifiant de l'affectation superviseur (N+1 hiérarchique) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_affectation_n_plus_1?: number | null;
}
