import { Asignacion } from './asignacion';

export interface OperarioEstadoDTO {
  username: string;
  fechaInicio: string | null;
  nroPlan: string | null;
  productoCodigo: string | null;
  productoDescripcion: string | null;
  operacionNombre: string | null;
  nroMaquina: number | null;
  /** Asignación que está ejecutando, si la tarea salió de una asignación. */
  enCurso?: Asignacion | null;
  /** Cola de trabajo pendiente, en orden de prioridad. */
  proximas?: Asignacion[];
}
