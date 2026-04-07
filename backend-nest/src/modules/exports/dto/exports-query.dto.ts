import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  template?: boolean;
}
