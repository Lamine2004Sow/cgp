import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class OrganigrammeGenerateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_annee!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_entite_racine!: number;
}
