export interface OrdenResponseDTO {
  id: number;
  ordNroPlan: string;
  anio: number;
  observacion: string | null;
  clienteId: number;
  productoCodigo: string;
  productoDescripcion: string;
  situacionClave: string;
  hoja: string | null;
  etiqueta: string | null;
  cantidad: number | null;
  fechaInicio: string | null;        // ISO strings from backend
  fechaFinalizacion: string | null;  // ISO strings from backend
  ordenInterna: string | null;
}
