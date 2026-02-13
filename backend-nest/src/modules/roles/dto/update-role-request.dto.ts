import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRoleRequestDto {
  @IsString()
  statut!: 'VALIDEE' | 'REFUSEE';

  @IsOptional()
  @IsString()
  role_id?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  niveau_hierarchique?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_composante?: number;
}
