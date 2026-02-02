import { IsOptional, IsString } from 'class-validator';

export class SignalementsListQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;
}
