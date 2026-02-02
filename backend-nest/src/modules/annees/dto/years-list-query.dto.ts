import { IsOptional, IsString } from 'class-validator';

export class YearsListQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;
}
