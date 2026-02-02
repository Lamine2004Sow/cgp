import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CloneYearDto {
  @IsString()
  libelle!: string;

  @IsDateString()
  date_debut!: string;

  @IsDateString()
  date_fin!: string;

  @IsString()
  statut!: string;

  @IsOptional()
  @IsBoolean()
  copy_affectations?: boolean;
}
