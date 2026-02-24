import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsInt, Min, ValidateNested } from 'class-validator';
import { ImportResponsableRowDto } from './import-responsables.dto';

export class ImportConfirmDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportResponsableRowDto)
  rows!: ImportResponsableRowDto[];

  /** Indices des lignes à exclure de l'import (0-based). Les autres sont appliquées. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  excludeIndices?: number[];
}
