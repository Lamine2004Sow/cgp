import { IsOptional, IsString } from 'class-validator';

export class UpdateSignalementDto {
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  commentaire?: string;
}
