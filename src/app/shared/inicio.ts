/**
 * A dónde va cada uno al entrar. El operario no ve Órdenes: su trabajo le llega
 * asignado, así que arranca en MI TRABAJO. El de logística arranca en PICKING,
 * que es su única pantalla.
 */
export function rutaDeInicio(): string {
  try {
    const data = localStorage.getItem('user');
    if (!data) return '/ordenes';
    const perms: string[] = JSON.parse(data)?.permissions ?? [];

    // Logística: ve picking y no tiene cola de producción.
    if (perms.includes('PICKING:READ') && !perms.includes('ORDENES:READ')) return '/picking';

    const esOperario = perms.includes('ASIGNACIONES:READ') && !perms.includes('ASIGNACIONES:WRITE');
    return esOperario ? '/mi-trabajo' : '/ordenes';
  } catch {
    return '/ordenes';
  }
}
