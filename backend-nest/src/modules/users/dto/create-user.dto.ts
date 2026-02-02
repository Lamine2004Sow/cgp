import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateAffectationDto } from './create-affectation.dto';

export class CreateUserDto {
  @IsString()
  login!: string;

  @IsString()
  nom!: string;

  @IsString()
  prenom!: string;

  @IsOptional()
  @IsEmail()
  email_institutionnel?: string | null;

  @IsOptional()
  @IsString()
  telephone?: string | null;

  @IsOptional()
  @IsString()
  bureau?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAffectationDto)
  affectations?: CreateAffectationDto[];
}
