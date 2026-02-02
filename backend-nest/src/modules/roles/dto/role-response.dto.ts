export interface RoleResponseDto {
  id: string;
  libelle: string;
  description?: string | null;
  niveauHierarchique: number;
  isGlobal: boolean;
  idComposante?: string | null;
}
