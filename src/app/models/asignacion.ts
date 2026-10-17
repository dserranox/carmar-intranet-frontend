export type EstadoAsignacion = 'PENDIENTE' | 'EN_CURSO' | 'SUSPENDIDA' | 'FINALIZADA' | 'CANCELADA';

/** Una actividad habilitada dentro del código asignado. */
export interface ActividadAsignada {
  aacId: number;
  operacionId: number;
  operacionNombre: string;
  operacionNombreCorto?: string;
  operacionGrupo?: string;
  cantidad?: number;
  nroMaquina?: number;
  puesto?: string;
  vecesHechas: number;
  minutosAcumulados: number;
  enCurso: boolean;
}

export interface TareaEnCurso {
  tareaId: number;
  aacId?: number;
  operacionId: number;
  operacionNombre: string;
  puesto?: string;
  nroMaquina?: number;
  cantidad?: number;
  fechaInicio: string;
  /** EN_CURSO | PAUSADA | SUSPENDIDA. El reloj lo lleva el servidor. */
  estado?: "EN_CURSO" | "PAUSADA" | "SUSPENDIDA";
  segundosEfectivos?: number;
  segundosPausa?: number;
  subtipoPausa?: string | null;
  motivoPausa?: string | null;
}

/** Un código asignado a un operario. */
export interface Asignacion {
  asgId: number;

  ordenId: number;
  nroPlan: string;
  productoCodigo?: string;
  productoDescripcion?: string;
  cantidadOrden?: number;

  operario: string;
  cantidad?: number;
  prioridad: number;
  nroMaquina?: number;
  puesto?: string;
  estado: EstadoAsignacion;
  observaciones?: string;

  actividades: ActividadAsignada[];
  enCurso?: TareaEnCurso | null;

  tareasHechas: number;
  minutosTrabajados: number;
  minutosPausa: number;

  fechaAsignacion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaSuspension?: string;
  subtipoSuspension?: string;
  motivoSuspension?: string;

  asignadaPor?: string;
}

/** Una fila del asignador: a quién, qué actividades, cuántas unidades y dónde. */
export interface AsignarItem {
  operacionIds: number[];
  operario: string;
  cantidad: number | null;
  nroMaquina: number | null;
  puesto: string;
  observaciones?: string;
}

export interface AsignarRequest {
  ordenId: number;
  items: AsignarItem[];
}

export interface AsignarResponse {
  creadas: Asignacion[];
  advertencias: string[];
}
