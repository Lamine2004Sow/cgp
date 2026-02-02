export interface UserResponseDto {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  emailInstitutionnel?: string | null;
  statut: string;
}
