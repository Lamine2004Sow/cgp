import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEntiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tel_service?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bureau_service?: string | null;

  /** Composante uniquement */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  site_web?: string | null;

  /** Département uniquement */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code_interne?: string | null;

  /** Mention uniquement */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type_diplome?: string | null;

  /** Parcours uniquement */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code_parcours?: string | null;

  /** Niveau uniquement */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  libelle_court?: string | null;
}
