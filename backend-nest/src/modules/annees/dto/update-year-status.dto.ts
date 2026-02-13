import { IsString } from 'class-validator';

export class UpdateYearStatusDto {
  @IsString()
  statut!: 'EN_COURS' | 'PREPARATION' | 'ARCHIVEE';
}
