/** Un control que cargó un operario durante el corte. */
export interface RegistroCalidad {
  ccaId: number;
  fecha: string;
  tipo: 'LONGITUD' | 'TRACCION';
  resultado: 'OK' | 'NO_OK';
  usuario: string;
  sabana: string | null;
  nroPlan: string | null;
  codigo: string | null;
  nroCorte: number | null;
  nroCable: string | null;
  color: string | null;
  extremo: string | null;
  terminal: string | null;
  seccion: number | null;
  valorNominal: number | null;
  valorMedido: number | null;
  valorMin: number | null;
  valorMax: number | null;
  desvio: number | null;
  observaciones: string | null;
}

export interface ResumenCalidad {
  totalControles: number;
  conformes: number;
  noConformes: number;
  controlesLongitud: number;
  controlesTraccion: number;
  registros: RegistroCalidad[];
}

export type ResultadoPunto = 'PENDIENTE' | 'OK' | 'KO' | 'NA';

export interface ItemControl {
  rciId?: number;
  puntoId: number;
  punto?: string;
  orden?: number;
  resultado: ResultadoPunto;
  observaciones: string | null;
}

export interface ControlRuta {
  rccId: number;
  ordenId: number;
  nroPlan: string;
  productoCodigo: string | null;
  productoDescripcion: string | null;
  clienteRazonSocial: string | null;
  situacionClave: string | null;
  puesto: string | null;
  operario: string | null;
  resultado: 'PENDIENTE' | 'OK' | 'KO';
  observaciones: string | null;
  fecha: string;
  items: ItemControl[];
}

export interface RutaCalidad {
  rcaId: number;
  fecha: string;
  numero: number;
  responsable: string;
  estado: 'EN_CURSO' | 'CERRADA';
  fechaInicio: string;
  fechaFin: string | null;
  observaciones: string | null;
  tareaId: number | null;
  minutos: number;
  ordenesControladas: number;
  ordenesOk: number;
  ordenesKo: number;
  ordenesPendientes: number;
  controles?: ControlRuta[];
}

/** Una orden que el responsable puede elegir para controlar. */
export interface OrdenAbierta {
  ordenId: number;
  nroPlan: string;
  productoCodigo: string | null;
  productoDescripcion: string | null;
  clienteRazonSocial: string | null;
  situacionClave: string | null;
  cantidad: number | null;
  operarios: string[];
  puestos: string[];
  yaControlada: boolean;
}

export interface PuntoControl {
  pcoId: number;
  nombre: string;
  orden: number;
}

/** Punto de control tal como lo edita el responsable en la pantalla de configuración. */
export interface PuntoControlAbm {
  pcoId?: number;
  nombre: string;
  descripcion: string | null;
  orden?: number;
  activo: boolean;
  usos?: number;
}
