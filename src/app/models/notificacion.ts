export type SeveridadNotificacion = 'INFO' | 'ALERTA' | 'CRITICA';

export interface Notificacion {
  /** Id de la entrega: es lo que se marca como leído. */
  nodId: number;
  nofId: number;
  tipo: 'CALIDAD_KO' | 'CONTROL_NO_CONFORME' | string;
  severidad: SeveridadNotificacion;
  titulo: string;
  mensaje: string;
  origenTipo: string | null;
  origenId: number | null;
  ordenId: number | null;
  nroPlan: string | null;
  generadaPor: string | null;
  fecha: string;
  leida: boolean;
  fechaLectura: string | null;
}
