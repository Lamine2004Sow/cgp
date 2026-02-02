import { CreateAffectationDto } from './create-affectation.dto';
export declare class CreateUserDto {
    login: string;
    nom: string;
    prenom: string;
    email_institutionnel?: string | null;
    telephone?: string | null;
    bureau?: string | null;
    affectations?: CreateAffectationDto[];
}
