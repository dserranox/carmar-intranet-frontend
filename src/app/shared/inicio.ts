/**
 * A dónde va cada uno al entrar. El operario no ve Órdenes: su trabajo le llega
 * asignado, así que arranca en MI TRABAJO.
 */
export function rutaDeInicio(): string {
  try {
    const data = localStorage.getItem('user');
    if (!data) return '/ordenes';
    const perms: string[] = JSON.parse(data)?.permissions ?? [];
    const esOperario = perms.includes('ASIGNACIONES:READ') && !perms.includes('ASIGNACIONES:WRITE');
    return esOperario ? '/mi-trabajo' : '/ordenes';
  } catch {
    return '/ordenes';
  }
}
