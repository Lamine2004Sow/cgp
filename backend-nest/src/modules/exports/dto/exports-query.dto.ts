import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ExportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  yearId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entiteId?: number;

  @IsOptional()
  @IsString()
  roleId?: string;
}
