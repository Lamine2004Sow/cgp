import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAffectationDto {
  @Type(() => Number)
  @IsInt()
  id_user!: number;

  @IsString()
  id_role!: string;

  @Type(() => Number)
  @IsInt()
  id_entite!: number;

  @Type(() => Number)
  @IsInt()
  id_annee!: number;

  @IsDateString()
  date_debut!: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;
}
