import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { permisoDeLaRuta, tienePermiso } from './pantallas';
import { rutaDeInicio } from './inicio';

/**
 * Cierra la puerta de atrás: sacar una pantalla del menú no alcanza si escribiendo
 * la dirección a mano se entra igual. Acá se valida el permiso de la ruta antes
 * de abrirla, y el servidor lo vuelve a pedir en cada llamada.
 */
export const permisoGuard: CanActivateChildFn = (_ruta, estado) => {
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  const permiso = permisoDeLaRuta(estado.url);
  if (!permiso || tienePermiso(permiso)) return true;

  snack.open('Esa pantalla no está habilitada para tu usuario.', 'OK', { duration: 5000 });
  return router.parseUrl(rutaDeInicio());
};
