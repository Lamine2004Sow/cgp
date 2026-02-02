import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSignalementDto {
  @IsString()
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_entite_cible?: number | null;
}
