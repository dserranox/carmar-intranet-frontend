/** Una etiqueta con su número; el secundario aparece cuando hace falta. */
export interface Valor {
  etiqueta: string;
  valor: number;
  secundario?: number | null;
}

export interface EnPlanta {
  usuario: string;
  estado: 'EN_CURSO' | 'PAUSADA' | 'SUSPENDIDA' | string;
  operacion: string | null;
  nroPlan: string | null;
  puesto: string | null;
  minutos: number | null;
}

export interface Colgada {
  tareaId: number;
  usuario: string;
  operacion: string;
  nroPlan: string | null;
  horas: number;
}

export interface Rendimiento {
  operacion: string;
  area: string;
  tareas: number;
  unidades: number;
  horas: number;
  unidadesPorHora: number | null;
}

export interface Plazo {
  terminadas: number;
  promedioDias: number | null;
  minimoDias: number | null;
  maximoDias: number | null;
}

export interface Carga {
  usuario: string;
  tareas: number;
  unidades: number;
  horas: number;
  noConformes: number;
}

export interface Control {
  tipo: string;
  origen: string;
  total: number;
  noOk: number;
}

export interface NoConforme {
  operacion: string;
  unidades: number;
  noConformes: number;
  porcentaje: number | null;
}

export interface Traccion {
  seccion: string;
  terminal: string;
  mediciones: number;
  promedio: number | null;
  minimoExigido: number | null;
  margen: number | null;
  noOk: number;
}

export interface Faltante {
  codigo: string;
  descripcion: string | null;
  lineas: number;
  cantidad: number;
  pedido: boolean;
}

export interface Tablero {
  desde: string;
  hasta: string;

  operariosTrabajando: number;
  operariosEnPausa: number;
  operariosSuspendidos: number;
  operariosSinTarea: number;
  enPlanta: EnPlanta[];
  tareasPorArea: Valor[];
  ordenesEnProceso: number;
  ordenesPlanificadas: number;
  tareasColgadas: Colgada[];

  rendimientoPorOperacion: Rendimiento[];
  segundosEfectivos: number;
  segundosSetup: number;
  segundosPausa: number;
  motivosPausa: Valor[];
  motivosSuspension: Valor[];
  plazoOrdenes: Plazo;
  metrosCable: number;
  metrosCorrugado: number;
  metrosCablePendientes: number;
  cargaPorOperario: Carga[];

  controles: Control[];
  noConformesPorOperacion: NoConforme[];
  ordenesConTrabajo: number;
  ordenesSinFalla: number;
  dondeFalla: Valor[];
  margenTraccion: Traccion[];
  recorridasHechas: number;
  recorridasOrdenes: number;
  recorridasConKo: number;
  ncAbiertas: number;
  ncCerradas: number;
  ncAntiguedadDias: number | null;
  ncPorOrigen: Valor[];

  pickingsPorEstado: Valor[];
  faltantes: Faltante[];
  minutosPreparacionPicking: number | null;
  planesTrabados: number;

  tareasSinCerrarUnDia: number;
  ordenesSinAsignar: number;
  operariosSinCargar: string[];
}
