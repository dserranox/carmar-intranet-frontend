export interface ProductoDocumentosDTO {
  pdoId: number;
  pdoNombre: string;
  pdoDriveUrl: string;
}

export interface TareasDTO {
  id: number;
  ordenId: number;
  nroPlan: string | null;
  operacionId: number;
  operacionNombre: string | null;
  operacionNombreCorto: string | null;
  nroMaquina: number | null;
  fechaInicio: string | null;
  fechaFinalizacion: string | null;
  cantidad: number | null;
  observaciones: string | null;
  username: string | null;
  ordCantidad: number | null;
  documentos: ProductoDocumentosDTO[] | null;
}