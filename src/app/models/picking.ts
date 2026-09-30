export type EstadoPicking = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETO' | 'INCOMPLETO';
export type EstadoLinea = 'PENDIENTE' | 'RETIRADO' | 'PARCIAL' | 'FALTANTE';
export type MotivoFaltante = 'SIN_STOCK' | 'NO_ENCONTRADO' | 'OTRO';

export interface PickingLinea {
  pkdId: number;
  nroLinea: number;
  codigoPieza: string;
  /** Con qué código lo identifica el proveedor. */
  codigoProveedor?: string;
  descripcion?: string;
  um?: string;
  ubicacion?: string;
  cantPorProducto?: number;
  cantTotal: number;
  cantRetirada: number;
  /** Lo que todavía falta llevar. */
  cantFaltante: number;
  estado: EstadoLinea;
  motivoFaltante?: MotivoFaltante;
  observaciones?: string;
  usuarioRetiro?: string;
  fechaRetiro?: string;
  usuarioEntrega?: string;
  fechaEntrega?: string;
  pedido?: boolean;
  fechaPedido?: string;
}

export interface Picking {
  pckId: number;
  nroPlan: string;
  ordenId?: number;
  codigoProducto: string;
  productoDescripcion?: string;
  cantidadProducir?: number;
  estado: EstadoPicking;
  operario?: string;
  fechaInicio?: string;
  fechaFin?: string;
  segundos?: number;
  observaciones?: string;
  fechaCarga?: string;
  usuarioCarga?: string;

  totalLineas: number;
  lineasRetiradas: number;
  lineasFaltantes: number;
  lineasParciales: number;
  /** El plan no está cargado como orden: se avisa, no se bloquea. */
  sinOrden: boolean;

  lineas: PickingLinea[];
}

export interface PlanPreview {
  nroPlan: string;
  codigoProducto: string;
  productoDescripcion?: string;
  cantidadProducir?: number;
  lineas: number;
  sinOrden: boolean;
  yaExiste: boolean;
  conAvance: boolean;
  estadoExistente?: EstadoPicking;
  advertencias: string[];
  detalle: PickingLinea[];
}

export interface PickingImportResult {
  archivo?: string;
  filasLeidas: number;
  errores: string[];
  advertencias: string[];
  planes: PlanPreview[];
  importado: boolean;
  creados: string[];
}

export interface PendienteCompra {
  codigoPieza: string;
  codigoProveedor?: string;
  descripcion?: string;
  um?: string;
  cantidadFaltante: number;
  planes: string[];
  lineas: number;
  desde?: string;
  diasEsperando: number;
  pedido: boolean;
  fechaPedido?: string;
}
