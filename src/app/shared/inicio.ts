import { menuVisible, tienePermiso } from './pantallas';

/**
 * A dónde va cada uno al entrar.
 *
 * Quien tiene el tablero arranca ahí: es la foto de la planta y lo primero que
 * se mira a la mañana. Si no, quien reparte trabajo va a ÓRDENES, aunque también
 * tenga MI TRABAJO, porque su día empieza mirando la planta y no su propia cola.
 * El resto arranca en la primera pantalla que su rol tenga — el operario en MI
 * TRABAJO, logística en PICKING — y quien quedó sin ninguna va al perfil, que al
 * menos le deja cambiar la clave y pedir que le den permisos.
 */
export function rutaDeInicio(): string {
  const visibles = menuVisible();
  if (!visibles.length) return '/perfil';

  if (tienePermiso('TABLERO:READ')) {
    const tablero = visibles.find(e => e.ruta === '/tablero');
    if (tablero) return tablero.ruta;
  }
  if (tienePermiso('ASIGNACIONES:WRITE')) {
    const ordenes = visibles.find(e => e.ruta === '/ordenes');
    if (ordenes) return ordenes.ruta;
  }
  return visibles[0].ruta;
}
