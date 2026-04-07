import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  root_entite_ids?: number[];
}
