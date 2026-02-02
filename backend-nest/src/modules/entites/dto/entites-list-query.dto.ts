import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class EntitesListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  yearId?: number;
}
