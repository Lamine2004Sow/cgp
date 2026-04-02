import { IsOptional, IsString } from 'class-validator';

export class OrganigrammeExportQueryDto {
  @IsOptional()
  @IsString()
  format?: 'PDF' | 'CSV' | 'JSON' | 'SVG';
}
