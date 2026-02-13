import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DelegationsListQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entiteId?: number;
}
