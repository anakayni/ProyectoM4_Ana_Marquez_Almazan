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
  createdBy: string;
  createdAt: number;
  rev: number;
}

export type ProjectInput = Pick<Project, 'name' | 'description' | 'color' | 'ownerId' | 'startDate' | 'endDate'>;

export type ProjectPatch = Partial<ProjectInput & Pick<Project, 'archived'>>;
