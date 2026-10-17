/** Acceso de un Invitado en un proyecto: "Solo ver" o "Puede editar". */
export type GuestAccess = 'view' | 'edit';

export interface Project {
  id: string;
  name: string;
  description: string;
  /** '#RRGGBB' elegido con el selector */
  color: string;
  /** Persona a cargo (admin o miembro) */
  ownerId: string;
  /** Fechas locales 'YYYY-MM-DD' */
  startDate: string;
  endDate: string;
  archived: boolean;
  /** Personas agregadas por el admin (los Invitados ven el proyecto si están acá). */
  memberIds?: string[];
  /** Acceso de cada Invitado en este proyecto; sin entrada = "Puede editar". */
  guestAccess?: Record<string, GuestAccess>;
  createdBy: string;
  createdAt: number;
  rev: number;
}

export type ProjectInput = Pick<Project, 'name' | 'description' | 'color' | 'ownerId' | 'startDate' | 'endDate'>;

export type ProjectPatch = Partial<ProjectInput & Pick<Project, 'archived'>>;
