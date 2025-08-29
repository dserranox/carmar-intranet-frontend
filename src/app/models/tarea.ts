export interface TareasDTO {
  id: number;
  ordenId: number;
  operacionId: number;
  operacionNombre: string | null;
  nroMaquina: number | null;
  fechaInicio: string | null;
  fechaFinalizacion: string | null;
  cantidad: number | null;
  observaciones: string | null;
  usuarioId: number | null;
  usuarioNombre: string | null;
}