import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrganigrammeFreezeDto {
  @IsOptional()
  @IsBoolean()
  est_fige?: boolean;
}
