import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAffectationDto {
  @IsOptional()
  @IsString()
  id_role?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string | null;
}
