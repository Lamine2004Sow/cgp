import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ImportResponsableRowDto {
  @IsString()
  login!: string;

  @IsString()
  nom!: string;

  @IsString()
  prenom!: string;

  @IsOptional()
  @IsEmail()
  email_institutionnel?: string | null;

  @IsOptional()
  @IsString()
  telephone?: string | null;

  @IsOptional()
  @IsString()
  bureau?: string | null;

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

export class ImportResponsablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportResponsableRowDto)
  rows!: ImportResponsableRowDto[];
}
