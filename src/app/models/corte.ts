export interface SabanaResumen {
  sabId: number;
  nombre: string;
  archivo?: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'SUSPENDIDA' | 'FINALIZADA';
  /** Qué se corta en esta sábana. */
  tipo?: 'CABLE' | 'CORRUGADO';
  operario?: string;
  nroMaquina?: number;
  fechaInicio?: string;
  fechaFin?: string;
  toleranciaInf: number;
  toleranciaSup: number;
  observaciones?: string;
  fechaSuspension?: string;
  subtipoSuspension?: string;
  motivoSuspension?: string;
  totalCortes: number;
  cortesHechos: number;
  segundosAcumulados?: number;
  segundosSetup?: number;
  segundosPausa?: number;
  planes: string[];
}

export interface ControlCalidad {
  ccaId?: number;
  scdId?: number;
  nroCorte?: number;
  tipo: 'LONGITUD' | 'TRACCION';
  extremo?: 'A' | 'B' | null;
  valorNominal?: number;
  valorMedido: number;
  valorMin?: number;
  valorMax?: number;
  resultado?: 'OK' | 'NO_OK';
  seccion?: number;
  terminal?: string;
  observaciones?: string;
  usuario?: string;
  fecha?: string;
}

export interface Corte {
  scdId: number;
  sabId: number;
  nroCorte: number;
  nroPlan: string;
  codigo: string;
  productoDescripcion?: string;
  cantidad?: number;
  nroCable?: string;
  color?: string;
  seccion?: number;

  origenA?: string;
  /** Dónde entra en el origen: la cavidad del conector, o IZQ/DER si es soldadura. */
  posicionA?: string;

  /** Cuando quedó salteado: por qué, cuándo, quién y de qué sábana venía. */
  subtipoSalteo?: string;
  motivoSalteo?: string;
  fechaSalteo?: string | null;
  salteadoPor?: string;
  sabanaNombre?: string;
  sabanaOrigenNombre?: string;
  tipoSabana?: string;
  terminalA?: string;
  peladoA?: number;
  gapA?: number;

  longitud: number;

  gapB?: number;
  peladoB?: number;
  terminalB?: string;
  destinoB?: string;
  posicionB?: string;

  impresion?: string;

  /** Corrugado: diámetro en mm, abierto o cerrado, y programa de la máquina. */
  diametro?: number;
  /** El diámetro como lo nombra la sábana: 1/2, 3/4, 13 mm… */
  diametroTxt?: string;
  /** Cuántos tramos de este largo lleva un producto. */
  cantPorProducto?: number;
  tipoCorrugado?: 'ABIERTO' | 'CERRADO';
  programa?: string;

  cambioBobina?: boolean;
  cambioTerminal?: boolean;
  reqCtrlLongitud?: boolean;
  reqCtrlTraccionA?: boolean;
  reqCtrlTraccionB?: boolean;

  longitudMin?: number;
  longitudMax?: number;
  fuerzaMinimaA?: number;
  despunteA?: "TOTAL" | "PARCIAL";
  despunteB?: "TOTAL" | "PARCIAL";
  pvcPuntaA?: number;
  pvcPuntaB?: number;
  cobreA?: number;
  cobreB?: number;
  setupRegistrado?: boolean;
  alertaCrimpadoA?: boolean;
  alertaCrimpadoB?: boolean;
  fuerzaMinimaB?: number;

  colorAnterior?: string;
  seccionAnterior?: number;
  terminalAnteriorA?: string;
  terminalAnteriorB?: string;

  estado: 'PENDIENTE' | 'HECHO';
  fechaInicio?: string;
  fechaFin?: string;
  segundos?: number;
  noConforme?: number;
  observaciones?: string;

  posicion: number;
  totalCortes: number;
  cortesHechos: number;

  controles?: ControlCalidad[];
}

export interface RegistrarCorteRequest {
  segundos: number;
  noConforme?: number;
  observaciones?: string;
  controles: Array<{ tipo: string; extremo?: string | null; valorMedido: number; observaciones?: string }>;
}

export interface RegistrarCorteResponse {
  siguiente?: Corte;
  sabana: SabanaResumen;
  tareasGeneradas: string[];
  sabanaFinalizada: boolean;
  /** Cuántos cortes quedaron salteados: mientras haya, la sábana no se cierra sola. */
  salteadosPendientes?: number;
}

export interface SabanaImportResult {
  sabId?: number;
  nombre?: string;
  filasLeidas: number;
  cortesImportados: number;
  errores: string[];
  advertencias: string[];
  planesNoEncontrados: string[];
  ordenesCreadas: string[];
  importada: boolean;
}

export interface TraccionMinima {
  trmId?: number;
  trmSeccion: number;
  trmFuerzaMin: number;
  /** Vacío = valor general de la sección; con dato = excepción para ese terminal. */
  trmTerminal?: string | null;
  trmObservaciones?: string | null;
}

export type TipoEvento = 'SETUP' | 'PAUSA';

export interface EventoCorte {
  evcId?: number;
  sabId?: number;
  scdId?: number;
  nroCorte?: number;
  codigo?: string;
  nroPlan?: string;
  tipo: TipoEvento;
  subtipo: string;
  motivo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  segundos: number;
  usuario?: string;
}

export interface RegistrarEventoRequest {
  tipo: TipoEvento;
  subtipo: string;
  motivo?: string;
  segundos: number;
}
