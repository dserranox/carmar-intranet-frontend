export type TipoNC = 'INTERNA' | 'EXTERNA';
/**
 * PENDIENTE: reportada, esperando que calidad confirme que lo es.
 * NO_PROCEDENTE: la validación dijo que no era una no conformidad.
 * ANULADA: ya estaba validada y resultó mal cargada o repetida.
 *
 * Solo ABIERTA y CERRADA cuentan en los indicadores.
 */
export type EstadoNC = 'PENDIENTE' | 'ABIERTA' | 'CERRADA' | 'NO_PROCEDENTE' | 'ANULADA';
export type EjecucionNC = 'PENDIENTE' | 'EJECUTADA' | 'NO_EJECUTADA';

export type OrigenNC =
  | 'AUDITORIA_INTERNA' | 'RUTA_CONTROL' | 'MURO_CALIDAD'
  | 'CONTROL_RECEPCION' | 'AUTOCONTROL' | 'OTRO_INTERNO'
  | 'DETECTADA_CLIENTE' | 'OTRO_EXTERNO';

export interface AdjuntoNC {
  ncaId: number;
  nombre: string;
  tipo: string;
  tamanio: number;
  descripcion: string | null;
  fecha: string;
}

export interface NoConformidad {
  ncfId?: number;
  numero?: number;
  tipo: TipoNC;
  fechaEmision?: string;

  emitidaA: 'PRODUCCION' | 'OTRO';
  emitidaAOtro?: string | null;

  emite: 'CALIDAD' | 'CLIENTE' | 'OTRO';
  clienteId?: number | null;
  clienteRazonSocial?: string | null;
  emiteOtro?: string | null;

  origen: OrigenNC;
  origenOtro?: string | null;

  descripcion: string;
  accionInmediata?: string | null;
  analisisCausas?: string | null;
  accionCorrectiva?: string | null;
  verificacionEficacia?: string | null;
  observaciones?: string | null;

  ejecucion?: EjecucionNC;
  fechaVerificacion?: string | null;

  estado?: EstadoNC;
  fechaCierre?: string | null;
  cerradaPor?: string | null;

  /** Quién decidió que esto es (o no es) una no conformidad. */
  fechaValidacion?: string | null;
  validadaPor?: string | null;
  motivoRechazo?: string | null;

  /** Una NC ya validada que estaba mal cargada o repetida. */
  fechaAnulacion?: string | null;
  anuladaPor?: string | null;
  motivoAnulacion?: string | null;

  ordenId?: number | null;
  nroPlan?: string | null;
  productoCodigo?: string | null;
  productoDescripcion?: string | null;
  lote?: string | null;
  rccId?: number | null;
  ccaId?: number | null;
  operario?: string | null;
  puesto?: string | null;

  abiertaPor?: string;
  responsables?: string[];
  adjuntos?: AdjuntoNC[];
}

/** Lo que propone el sistema cuando un KO obliga a abrir una NC. */
export interface BorradorNC {
  tipo: TipoNC;
  emitidaA: 'PRODUCCION' | 'OTRO';
  emite: 'CALIDAD' | 'CLIENTE' | 'OTRO';
  origen: OrigenNC;
  descripcion: string;
  ordenId: number | null;
  nroPlan: string | null;
  productoCodigo: string | null;
  productoDescripcion: string | null;
  rccId: number | null;
  operario: string | null;
  puesto: string | null;
  puntosKo: string[];
  ncfExistente: number | null;
  numeroExistente: number | null;
}

/** Etiquetas para mostrar, en un solo lugar. */
export const ORIGENES_INTERNOS: { valor: OrigenNC; texto: string }[] = [
  { valor: 'AUDITORIA_INTERNA', texto: 'Auditoría interna' },
  { valor: 'RUTA_CONTROL', texto: 'Ruta de control' },
  { valor: 'MURO_CALIDAD', texto: 'Muro de calidad' },
  { valor: 'CONTROL_RECEPCION', texto: 'Control de recepción' },
  { valor: 'AUTOCONTROL', texto: 'Autocontrol' },
  { valor: 'OTRO_INTERNO', texto: 'Otro' }
];

export const ORIGENES_EXTERNOS: { valor: OrigenNC; texto: string }[] = [
  { valor: 'DETECTADA_CLIENTE', texto: 'Detectada por el cliente' },
  { valor: 'OTRO_EXTERNO', texto: 'Otro' }
];

export function etiquetaOrigen(origen: string | null | undefined): string {
  const todos = [...ORIGENES_INTERNOS, ...ORIGENES_EXTERNOS];
  return todos.find(o => o.valor === origen)?.texto ?? (origen ?? '—');
}
