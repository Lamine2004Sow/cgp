import { IsOptional, IsString } from 'class-validator';

export class RoleRequestsQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;
}
