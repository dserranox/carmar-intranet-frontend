export interface OrdenCreateDTO {
  anio?: number;
  ordNroPlan?: string;
  ordenInterna?: string;
  clienteId?: number;
  productoId?: number;
  productoCodigo?: string;
  fechaInicio?: string;  // ISO string
  cantidad?: number;
  hoja?: string;
  etiqueta?: string;
  situacionClave?: string;
  fechaFinalizacion?: string;  // ISO string
  loteProduccion?: number;
  series?: number;
  observacion?: string;
}
