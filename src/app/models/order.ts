export interface OrdenResponseDTO {
  id: number;
  ordNroPlan: string;
  anio: number;
  observacion: string | null;
  clienteId: number;
  clienteRazonSocial: string | null;
  productoCodigo: string;
  productoDescripcion: string;
  situacionClave: string;
  hoja: string | null;
  etiqueta: string | null;
  cantidad: number | null;
  fechaInicio: string | null;        // ISO strings from backend
  fechaFinalizacion: string | null;  // ISO strings from backend
  fechaCreacion: string | null;      // ISO strings from backend
  ordenInterna: string | null;
}

/** Lo que devuelve el cambio de estado de varias órdenes juntas. */
export interface CambioMasivoResultado {
  situacionClave: string;
  cambiadas: { id: number; nroPlan: string }[];
  rechazadas: { id: number; nroPlan: string; motivo: string }[];
}
