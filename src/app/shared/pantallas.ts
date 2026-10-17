/**
 * Las pantallas de la app con el permiso que hace falta para entrar.
 *
 * Es el espejo del catálogo del backend (PantallasCatalogo): acá se usa para
 * armar el menú y para frenar a quien escriba la dirección a mano. El permiso
 * real lo sigue pidiendo el servidor; esto es para no ofrecer puertas que no
 * se van a poder abrir.
 */
export interface EntradaDeMenu {
  etiqueta: string;
  ruta: string;
  permiso: string;
}

export const MENU: EntradaDeMenu[] = [
  { etiqueta: 'TABLERO',          ruta: '/tablero',          permiso: 'TABLERO:READ' },
  { etiqueta: 'MI TRABAJO',       ruta: '/mi-trabajo',       permiso: 'ASIGNACIONES:READ' },
  { etiqueta: 'ORDENES',          ruta: '/ordenes',          permiso: 'ORDENES:READ' },
  { etiqueta: 'TAREAS',           ruta: '/tareas',           permiso: 'TAREAS:READ_ALL' },
  { etiqueta: 'CORTE',            ruta: '/corte',            permiso: 'CORTE:READ' },
  { etiqueta: 'PICKING',          ruta: '/picking',          permiso: 'PICKING:READ' },
  { etiqueta: 'CALIDAD',          ruta: '/calidad',          permiso: 'CALIDAD:READ' },
  { etiqueta: 'NO CONFORMIDADES', ruta: '/no-conformidades', permiso: 'NOCONFORMIDADES:READ' },
  { etiqueta: 'OPERARIOS',        ruta: '/admin/operarios',  permiso: 'ASIGNACIONES:READ_ALL' },
  { etiqueta: 'USUARIOS',         ruta: '/admin/usuarios',   permiso: 'USUARIOS:READ' }
];

/** El permiso que pide cada ruta, incluidas las que no están en el menú. */
export const PERMISO_POR_RUTA: { prefijo: string; permiso: string }[] = [
  { prefijo: '/tablero',          permiso: 'TABLERO:READ' },
  { prefijo: '/mi-trabajo',       permiso: 'ASIGNACIONES:READ' },
  { prefijo: '/ordenes',          permiso: 'ORDENES:READ' },
  { prefijo: '/tareas',           permiso: 'TAREAS:READ_ALL' },
  { prefijo: '/corte',            permiso: 'CORTE:READ' },
  { prefijo: '/picking',          permiso: 'PICKING:READ' },
  { prefijo: '/calidad',          permiso: 'CALIDAD:READ' },
  { prefijo: '/no-conformidades', permiso: 'NOCONFORMIDADES:READ' },
  { prefijo: '/admin/operarios',  permiso: 'ASIGNACIONES:READ_ALL' },
  { prefijo: '/admin/usuarios',   permiso: 'USUARIOS:READ' },
  { prefijo: '/admin/roles',      permiso: 'USUARIOS:READ' }
];

/** Las que puede abrir cualquiera que haya entrado. */
export const RUTAS_LIBRES = ['/perfil', '/notificaciones', '/login'];

export function permisosDelUsuario(): string[] {
  try {
    const data = localStorage.getItem('user');
    if (!data) return [];
    const perms = JSON.parse(data)?.permissions;
    return Array.isArray(perms) ? perms : [];
  } catch {
    return [];
  }
}

export function tienePermiso(permiso: string): boolean {
  return permisosDelUsuario().includes(permiso);
}

/** Qué permiso pide esta dirección, o null si la puede abrir cualquiera. */
export function permisoDeLaRuta(url: string): string | null {
  const ruta = url.split('?')[0];
  if (RUTAS_LIBRES.some(libre => ruta === libre || ruta.startsWith(libre + '/'))) return null;
  // Gana el prefijo más largo: /admin/usuarios antes que /admin.
  const encontrada = [...PERMISO_POR_RUTA]
    .sort((a, b) => b.prefijo.length - a.prefijo.length)
    .find(p => ruta === p.prefijo || ruta.startsWith(p.prefijo + '/'));
  return encontrada ? encontrada.permiso : null;
}

/** Las entradas de menú que este usuario puede ver. */
export function menuVisible(): EntradaDeMenu[] {
  const permisos = permisosDelUsuario();
  return MENU.filter(e => permisos.includes(e.permiso));
}
