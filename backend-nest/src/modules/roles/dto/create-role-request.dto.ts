import { IsOptional, IsString } from 'class-validator';

export class CreateRoleRequestDto {
  @IsString()
  role_propose!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  justificatif?: string | null;
}
